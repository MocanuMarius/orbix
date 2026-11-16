import {newState,createRun,chooseStartingGift} from './model.mjs?v=flight-120-1';

export function createLanternMapInspectorState() {
 const state=newState();
 // Campaign seed 1 draws Hollow Sun first, including its ordinary flight rooms.
 state.run=createRun(state.profile,1,1);
 chooseStartingGift(state,'proximity-awakening');
 // Focus onboarding on the chapter instead of replaying the first-run resource lessons.
 state.profile.onboarding.seen=['lift','luminance','collector','collector-recovery','skills','routes','packed'];
 return state;
}
