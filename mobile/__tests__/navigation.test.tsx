import React from 'react';
import {act,create,ReactTestRenderer} from 'react-test-renderer';
const mockNavigate=jest.fn();
jest.mock('expo-router',()=>{
 const React=require('react');const Tabs=(props:any)=>props.tabBar({state:{index:0,routes:[{name:'index'}]}});
 Tabs.Screen=()=>null;return {Tabs,router:{navigate:(path:string)=>mockNavigate(path)}};
});
jest.mock('../src/components/FloatingTabDock',()=>({FloatingTabDock:(props:any)=>require('react').createElement('Dock',props)}));
import TabsLayout from '../app/(tabs)/_layout';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
test('SDK58 dock navigates without a legacy navigation callback prop',async()=>{
 let tree!:ReactTestRenderer;await act(async()=>{tree=create(<TabsLayout/>);});
 const dock=tree.root.findByType('Dock' as any);
 for(const tab of ['simulation','rooftop','index'])await act(async()=>dock.props.onSelectTab(tab));
 expect(mockNavigate.mock.calls.map(c=>c[0])).toEqual(['/simulation','/rooftop','/']);
 await act(async()=>tree.unmount());
});
