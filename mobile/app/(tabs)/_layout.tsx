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
        const currentRoute = state.routes[state.index].name as TabName;
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
      <Tabs.Screen name="rooftop" options={{ title: 'Rooftop' }} />
      <Tabs.Screen name="ai" options={{ title: 'AI' }} />
    </Tabs>
  );
}
