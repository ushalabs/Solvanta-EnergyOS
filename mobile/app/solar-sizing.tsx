import React, { useState } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { BillPickerUnavailableError, loadBillPicker } from '../src/api/billPicker';
import { readBillOnDevice } from '../src/local/billOcr';
import { billingMonths, pakistanSolarYield, sizeSolar } from '../src/api/solarSizing';
import { SolvantaScreen } from '../src/components/SolvantaScreen';
import {
  Action, Card, CardHeader, Chip, ChipGroup, Field, FieldRow, Label, Message,
  Metric, MetricGrid, ScreenHeader,
} from '../src/components/TwinControls';

type City = keyof typeof pakistanSolarYield;
const maxBillBytes = 8 * 1024 * 1024;

function previousMonth() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1)).toISOString().slice(0, 7);
}

export default function SolarSizing() {
  const [ending, setEnding] = useState(previousMonth);
  const [units, setUnits] = useState<Record<string, string>>({});
  const [city, setCity] = useState<City | 'Custom'>();
  const [customYield, setCustomYield] = useState('');
  const [readingBill, setReadingBill] = useState(false);
  const [notice, setNotice] = useState<{ text: string; warning?: boolean }>();
  const [result, setResult] = useState<ReturnType<typeof sizeSolar>>(null);

  const months = billingMonths(ending);
  const annualYield = city === 'Custom' ? Number(customYield) : city ? pakistanSolarYield[city] : 0;
  const estimate = annualYield >= 100 && annualYield <= 4000
    ? sizeSolar(months.map(month => units[month] ?? ''), annualYield)
    : null;

  async function uploadBill() {
    setReadingBill(true);
    setNotice(undefined);
    try {
      const { DocumentPicker } = loadBillPicker(Platform.OS);
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/png'],
        base64: false,
      });
      if (picked.canceled) return;
      const asset = picked.assets[0];
      if (asset.size && asset.size > maxBillBytes) {
        setNotice({ text: 'Choose a JPG or PNG under 8 MB.', warning: true });
        return;
      }

      // Text recognition runs on the phone; the bill never leaves the device.
      const readings = await readBillOnDevice(asset);
      if (!readings.length) {
        setNotice({ text: 'No month-and-unit readings found. Try a clearer bill or enter the units below.', warning: true });
        return;
      }
      setEnding(readings[readings.length - 1].month);
      setUnits(Object.fromEntries(readings.map(row => [row.month, String(row.units_kwh)])));
      setResult(null);
      setNotice({
        text: `Read ${readings.length} month${readings.length === 1 ? '' : 's'}. Compare the values with the bill and fill any blanks.`,
        warning: readings.length !== 12,
      });
    } catch (error) {
      if (error instanceof BillPickerUnavailableError) {
        setNotice({ text: error.message, warning: true });
        return;
      }
      const text = error instanceof Error ? error.message : 'The bill could not be read.';
      setNotice({ text, warning: true });
    } finally {
      setReadingBill(false);
    }
  }

  return (
    <SolvantaScreen banner="SOLAR PLANNING • Annual energy estimates">
      <ScreenHeader title="Solar sizing" subtitle="From your electricity bill" onBack={() => router.back()} />
      <Card>
        <CardHeader title="Read a Pakistani electricity bill" subtitle="Use a recent bill that shows your monthly usage history." />
        <Action title="Upload bill" variant="secondary" onPress={uploadBill} loading={readingBill} disabled={readingBill} />
        <Label caption tone="secondary">JPG or PNG up to 8 MB, such as a photo or screenshot of the bill. It is read on this device.</Label>
        <Label caption tone="secondary">Use the Month and Units history table. For bills that only show a usage chart, enter the readings below.</Label>
        {notice && <Message tone={notice.warning ? 'warning' : 'info'}>{notice.text}</Message>}
      </Card>

      <Card>
        <CardHeader title="Review 12 months of usage" subtitle="Enter the units used for each month in kWh." />
        <Field label="Last billing month (YYYY-MM)" value={ending} onChange={value => { setEnding(value); setResult(null); }} />
        {months.length > 0 ? (
          <FieldRow>
            {months.map(month => (
              <Field key={month} label={`${month} units (kWh)`} numeric value={units[month] ?? ''} onChange={value => {
                setUnits(previous => ({ ...previous, [month]: value }));
                setResult(null);
              }} />
            ))}
          </FieldRow>
        ) : <Message tone="warning">Enter a month such as 2026-10.</Message>}
      </Card>

      <Card>
        <CardHeader title="Solar yield" subtitle="Choose the nearest city to your installation." />
        <ChipGroup>
          {([...Object.keys(pakistanSolarYield), 'Custom'] as Array<City | 'Custom'>).map(place => (
            <Chip key={place} label={place} selected={city === place} onPress={() => { setCity(place); setResult(null); }} />
          ))}
        </ChipGroup>
        {city === 'Custom' ? (
          <Field label="Annual yield (kWh per kWp)" value={customYield} numeric hint="Enter a site estimate between 100 and 4,000." onChange={value => {
            setCustomYield(value);
            setResult(null);
          }} />
        ) : city && <Label caption tone="secondary">{annualYield.toFixed(0)} kWh/kWp per year from PVGIS. Fixed panels at optimal orientation and 14% system losses.</Label>}
        <Action title="Calculate solar sizes" onPress={() => setResult(estimate)} disabled={!estimate || readingBill} />
      </Card>

      {result && <Card>
        <CardHeader title="Solar array options" subtitle="Sized to offset a share of annual electricity use." />
        <MetricGrid>
          <Metric label="Annual usage" value={result.annualKwh.toLocaleString()} unit="kWh" />
          <Metric label="Average monthly usage" value={result.averageKwh.toLocaleString(undefined, { maximumFractionDigits: 1 })} unit="kWh" />
        </MetricGrid>
        <MetricGrid>
          {result.options.map(option => (
            <Metric key={option.offset} label={`${option.offset}% offset · ${option.targetKwh.toLocaleString()} kWh/year`} value={option.arrayKwp.toFixed(1)} unit="kWp" tone="accent" />
          ))}
        </MetricGrid>
        <Label caption tone="secondary">Estimates use annual energy and round up to the next 0.1 kWp. Roof shading, panel orientation, and available space affect actual output.</Label>
      </Card>}
    </SolvantaScreen>
  );
}
