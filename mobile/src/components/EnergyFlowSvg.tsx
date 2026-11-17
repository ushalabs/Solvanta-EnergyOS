import React, { ReactNode, useEffect, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, {
  cancelAnimation,
  Easing,
  SharedValue,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Battery, House, Sun, UtilityPole, Zap } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { SPACING } from '../theme/tokens';
import type { Flow } from '../api/overview';
import { EnergyMetricCard } from './EnergyMetricCard';
import { flowPaths, nodeRects, pathD, Point, polylineLength, sameSize, Size } from './energyFlowPaths';

export interface FlowNode {
  /** Already formatted; a dash when there is no reading. */
  value: string;
  unit?: string;
  subtext?: string;
  /** A pulse runs on this node's line only while power is flowing. */
  flow?: Flow;
  a11yLabel?: string;
}

interface EnergyFlowSvgProps {
  solar: FlowNode;
  grid: FlowNode;
  battery: FlowNode & { socPct?: number | null };
  home: FlowNode;
  /** Drawn above the nodes, for example the house. The line to the hub starts at its bottom edge. */
  children?: ReactNode;
  /** How far above the bottom of `children` the line starts. */
  originInset?: number;
  /** Set false to keep the lines still. Reduced motion always keeps them still. */
  animated?: boolean;
}

type NodeKey = 'solar' | 'grid' | 'battery' | 'home';

const HUB_SIZE = 44;
const COLUMN_GAP = 16;
const ROW_GAP = 20;
const LINE_WIDTH = 2;
const DOT_RADIUS = 3.5;
const PULSE_LENGTH = 18;
const PULSE_MS = 2400;

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** A short bright dash that travels from the first point to the last. */
function Pulse({ points, progress, color }: { points: Point[]; progress: SharedValue<number>; color: string }) {
  const length = polylineLength(points);
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: PULSE_LENGTH - progress.value * (length + PULSE_LENGTH),
  }));
  return (
    <AnimatedPath
      testID="flow-pulse"
      d={pathD(points)}
      stroke={color}
      strokeWidth={LINE_WIDTH + 1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      strokeDasharray={`${PULSE_LENGTH} ${length + PULSE_LENGTH}`}
      animatedProps={animatedProps}
    />
  );
}

export const EnergyFlowSvg: React.FC<EnergyFlowSvgProps> = ({
  solar,
  grid,
  battery,
  home,
  children,
  originInset = 0,
  animated = true,
}) => {
  const { tokens } = useTheme();
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);
  // Only sizes are kept. On web a layout event fires when an element resizes, not when it merely moves,
  // so positions read from events go stale. Positions are worked out from the sizes instead.
  const [size, setSize] = useState<Size | null>(null);
  const [topHeight, setTopHeight] = useState(0);
  const [nodesWidth, setNodesWidth] = useState(0);
  const [cards, setCards] = useState<Partial<Record<NodeKey, Size>>>({});

  const nodes: Record<NodeKey, FlowNode> = { solar, grid, battery, home };
  const moving = animated && !reducedMotion && Object.values(nodes).some(n => n.flow);

  useEffect(() => {
    if (!moving) return;
    progress.value = 0;
    progress.value = withRepeat(withTiming(1, { duration: PULSE_MS, easing: Easing.linear }), -1, false);
    return () => { cancelAnimation(progress); progress.value = 0; };
  }, [moving, progress]);

  const measure = (key: NodeKey) => (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setCards(previous => sameSize(previous[key], { width, height }) ? previous : { ...previous, [key]: { width, height } });
  };

  const { solar: solarSize, grid: gridSize, battery: batterySize, home: homeSize } = cards;
  const paths = size && nodesWidth && solarSize && gridSize && batterySize && homeSize
    ? flowPaths({
        originY: topHeight - originInset,
        ...nodeRects({ top: topHeight, width: nodesWidth, rowGap: ROW_GAP, solar: solarSize, grid: gridSize, battery: batterySize, home: homeSize }),
      })
    : null;

  const icon = (Icon: React.ComponentType<any>) => <Icon size={18} color={tokens.limeText} />;
  const card = (key: NodeKey, label: string, Icon: React.ComponentType<any>, extra?: { progressPct?: number | null; progressLabel?: string }) => (
    <EnergyMetricCard
      key={key}
      label={label}
      value={nodes[key].value}
      unit={nodes[key].unit}
      subtext={nodes[key].subtext}
      a11yLabel={nodes[key].a11yLabel}
      icon={icon(Icon)}
      onLayout={measure(key)}
      style={styles.node}
      {...extra}
    />
  );

  // A pulse follows the power: toward the hub from a source, away from it to a load.
  const pulsePoints = (key: NodeKey): Point[] | null => {
    const flow = nodes[key].flow;
    if (!paths || !flow) return null;
    return flow === 'in' ? [...paths[key]].reverse() : paths[key];
  };

  return (
    <View testID="energy-flow" onLayout={e => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
      {children ? <View testID="flow-top" onLayout={e => setTopHeight(e.nativeEvent.layout.height)}>{children}</View> : null}

      <View testID="flow-nodes" style={styles.nodes} onLayout={e => setNodesWidth(e.nativeEvent.layout.width)}>
        {card('solar', 'Solar', Sun)}
        {card('grid', 'Grid', UtilityPole)}
        {card('battery', 'Battery', Battery, {
          progressPct: battery.socPct ?? null,
          progressLabel: battery.socPct == null ? undefined : `${Math.round(battery.socPct)}%`,
        })}
        {card('home', 'Home', House)}
      </View>

      {paths && size ? (
        <Svg pointerEvents="none" width={size.width} height={size.height} style={styles.overlay}>
          {(['main', 'solar', 'grid', 'battery', 'home'] as const).map(key => (
            <Path
              key={key}
              testID="flow-line"
              d={pathD(paths[key])}
              stroke={tokens.limeMark}
              strokeWidth={LINE_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ))}
          {(['solar', 'grid', 'battery', 'home'] as const).map(key => {
            const end = paths[key][paths[key].length - 1];
            return <Circle key={key} testID="flow-dot" cx={end.x} cy={end.y} r={DOT_RADIUS} fill={tokens.limeMark} />;
          })}
          {moving ? (
            <>
              <Pulse points={paths.main} progress={progress} color={tokens.limeBright} />
              {(['solar', 'grid', 'battery', 'home'] as const).map(key => {
                const points = pulsePoints(key);
                return points ? <Pulse key={key} points={points} progress={progress} color={tokens.limeBright} /> : null;
              })}
            </>
          ) : null}
        </Svg>
      ) : null}

      {paths ? (
        <View
          pointerEvents="none"
          testID="flow-hub"
          style={[
            styles.hub,
            {
              left: paths.hub.x - HUB_SIZE / 2,
              top: paths.hub.y - HUB_SIZE / 2,
              backgroundColor: tokens.lime,
              boxShadow: `0px 0px 18px ${tokens.limeGlow}`,
            },
          ]}
        >
          <Zap size={20} color={tokens.onLime} strokeWidth={2.4} />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  nodes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: COLUMN_GAP,
    rowGap: ROW_GAP,
  },
  node: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '40%',
  },
  overlay: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  hub: {
    position: 'absolute',
    width: HUB_SIZE,
    height: HUB_SIZE,
    borderRadius: HUB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
