import { Screen } from './game';

export interface ScreenContextType {
  currentScreen: Screen;
  navigateTo: (screen: Screen) => void;
}
