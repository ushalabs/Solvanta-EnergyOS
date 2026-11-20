import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { BillPickerUnavailableError, loadBillPicker } from '../src/api/billPicker';
import { readBillOnDevice } from '../src/local/billOcr';
import { api } from '../src/api/client';
import { EnergyBarChart } from '../src/components/EnergyBarChart';
import { billingMonths, pakistanSolarYield, sizeSolar } from '../src/api/solarSizing';
import { SolvantaScreen } from '../src/components/SolvantaScreen';
import {
  Action, Card, CardHeader, Chip, ChipGroup, Field, FieldRow, Label, Message,
  Metric, MetricGrid, ScreenHeader, useBuildings,
} from '../src/components/TwinControls';

type City = keyof typeof pakistanSolarYield;
const maxBillBytes = 8 * 1024 * 1024;
type Source = 'bill' | 'manual' | 'demo';
type BillHistory = { ending_month: string; readings: Record<string, number>; city: string | null; custom_yield: number | null; source: Source; updated_at: string };
const SOURCE_BADGE: Record<Source, string> = { bill: 'FROM BILL', manual: 'ENTERED', demo: 'DEMO DATA' };
const monthName = (month: string) => new Date(`${month}-01T00:00:00Z`).toLocaleString('en', { month: 'short', timeZone: 'UTC' });

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
  const [source, setSource] = useState<Source>('manual');
  const building = useBuildings();
  const buildingName = building.buildings.find(b => b.id === building.id)?.name;

  // The selected building's saved bill history opens filled in, with the sizes already calculated.
  useEffect(() => {
    let active = true;
    if (!building.id) return;
    api.get<BillHistory>(`/buildings/${building.id}/bills`).then(saved => {
      if (!active) return;
      const savedCity = saved.city && saved.city in pakistanSolarYield ? saved.city as City : saved.custom_yield ? 'Custom' : undefined;
      const savedYield = savedCity === 'Custom' ? saved.custom_yield ?? 0 : savedCity ? pakistanSolarYield[savedCity] : 0;
      setEnding(saved.ending_month);
      setUnits(Object.fromEntries(Object.entries(saved.readings).map(([month, kwh]) => [month, String(kwh)])));
      setCity(savedCity);
      setCustomYield(saved.custom_yield ? String(saved.custom_yield) : '');
      setSource(saved.source);
      setResult(savedYield ? sizeSolar(billingMonths(saved.ending_month).map(m => saved.readings[m] === undefined ? '' : String(saved.readings[m])), savedYield) : null);
    }).catch(() => {});
    return () => { active = false; };
  }, [building.id]);

  async function calculate() {
    setResult(estimate);
    if (!building.id || !estimate) return;
    const readings = Object.fromEntries(months.filter(m => units[m]?.trim()).map(m => [m, Number(units[m])]));
    try {
      await api.request(`/buildings/${building.id}/bills`, { method: 'PUT', body: JSON.stringify({
        ending_month: ending, readings, source,
        city: city && city !== 'Custom' ? city : null, custom_yield: city === 'Custom' ? Number(customYield) : null,
      }) });
      setNotice({ text: `Saved this bill history to ${buildingName ?? 'the building'}.` });
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : 'The bill history could not be saved.', warning: true });
    }
  }

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
      setSource('bill');
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
      <ScreenHeader title="Solar sizing" subtitle={buildingName ? `${buildingName} · from electricity bills` : 'From your electricity bill'} onBack={() => router.back()} />
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
                if (source === 'demo') setSource('manual');
                setResult(null);
              }} />
            ))}
          </FieldRow>
        ) : <Message tone="warning">Enter a month such as 2026-10.</Message>}
      </Card>

      {(() => {
        const entered = months.filter(m => units[m]?.trim() && Number.isFinite(Number(units[m])));
        if (!entered.length) return null;
        const total = entered.reduce((sum, m) => sum + Number(units[m]), 0);
        return <EnergyBarChart
          title="Monthly electricity use"
          subtitle={`${monthName(months[0])} ${months[0].slice(0, 4)} – ${monthName(months[11])} ${months[11].slice(0, 4)}`}
          badge={SOURCE_BADGE[source]}
          headline={Math.round(total).toLocaleString()}
          headlineUnit={entered.length === 12 ? 'kWh in 12 months' : `kWh in ${entered.length} of 12 months`}
          data={months.map(m => ({ day: monthName(m), kwh: Number(units[m]) || 0 }))}
          axisLabels={[months[0], months[3], months[6], months[9], months[11]].map(monthName)}
          a11yLabel={`Monthly electricity use for 12 months ending ${ending}: ${Math.round(total)} kWh in total.`}
        />;
      })()}

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
        <Action title="Calculate solar sizes" onPress={calculate} disabled={!estimate || readingBill} />
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
