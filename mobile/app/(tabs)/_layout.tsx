import React from 'react';
import { Tabs, router } from 'expo-router';
import { FloatingTabDock, TabName } from '../../src/components/FloatingTabDock';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={({ state }: any) => {
        // Scheduling lives under the tabs so the dock stays visible; it belongs to the Simulation tab.
        const routeName = state.routes[state.index].name;
        const currentRoute = (routeName === 'scheduling' ? 'simulation' : routeName) as TabName;
        return (
          <FloatingTabDock
            currentTab={currentRoute}
            onSelectTab={(tabName) => {
              router.navigate(tabName === 'index' ? '/' : `/${tabName}`);
            }}
          />
        );
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="appliances" options={{ title: 'Appliances' }} />
      <Tabs.Screen name="simulation" options={{ title: 'Simulation' }} />
      {/* Reached from Simulation and Home. Hidden from the tab bar, which has no button for it. */}
      <Tabs.Screen name="scheduling" options={{ title: 'Scheduling', href: null }} />
      <Tabs.Screen name="rooftop" options={{ title: 'Rooftop' }} />
      <Tabs.Screen name="ai" options={{ title: 'AI' }} />
    </Tabs>
  );
}
