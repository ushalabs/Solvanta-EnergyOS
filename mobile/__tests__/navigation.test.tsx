import React from 'react';
import {act,create,ReactTestRenderer} from 'react-test-renderer';
declare const __dirname: string;
const mockNavigate=jest.fn();
let mockRoute='index';
jest.mock('expo-router',()=>{
 const React=require('react');const Tabs=(props:any)=>props.tabBar({state:{index:0,routes:[{name:mockRoute}]}});
 Tabs.Screen=()=>null;return {Tabs,router:{navigate:(path:string)=>mockNavigate(path)}};
});
jest.mock('../src/components/FloatingTabDock',()=>({FloatingTabDock:(props:any)=>require('react').createElement('Dock',props)}));
import TabsLayout from '../app/(tabs)/_layout';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
test('dock navigates without a legacy navigation callback prop',async()=>{
 let tree!:ReactTestRenderer;await act(async()=>{tree=create(<TabsLayout/>);});
 const dock=tree.root.findByType('Dock' as any);
 for(const tab of ['simulation','rooftop','index'])await act(async()=>dock.props.onSelectTab(tab));
 expect(mockNavigate.mock.calls.map(c=>c[0])).toEqual(['/simulation','/rooftop','/']);
 await act(async()=>tree.unmount());
});
test('the dock stays visible on Scheduling and shows the Simulation tab as active',async()=>{
 mockRoute='scheduling';
 let tree!:ReactTestRenderer;await act(async()=>{tree=create(<TabsLayout/>);});
 expect(tree.root.findByType('Dock' as any).props.currentTab).toBe('simulation');
 await act(async()=>tree.unmount());
 mockRoute='rooftop';
 await act(async()=>{tree=create(<TabsLayout/>);});
 expect(tree.root.findByType('Dock' as any).props.currentTab).toBe('rooftop');
 await act(async()=>tree.unmount());
 mockRoute='index';
});
test('Scheduling is registered under the tabs but hidden from the tab bar',async()=>{
 const layout=require('fs').readFileSync(require('path').join(__dirname,'../app/(tabs)/_layout.tsx'),'utf8');
 expect(layout).toMatch(/name="scheduling" options=\{\{ title: 'Scheduling', href: null \}\}/);
 expect(require('fs').existsSync(require('path').join(__dirname,'../app/scheduling.tsx'))).toBe(false);
 expect(require('fs').existsSync(require('path').join(__dirname,'../app/(tabs)/scheduling.tsx'))).toBe(true);
 const root=require('fs').readFileSync(require('path').join(__dirname,'../app/_layout.tsx'),'utf8');
 expect(root).not.toMatch(/name="scheduling"/);
});
