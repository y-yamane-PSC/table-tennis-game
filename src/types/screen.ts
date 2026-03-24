import { Screen } from './game';

export interface ScreenContextType {
  currentScreen: Screen;
  navigateTo: (screen: Screen) => void;
}

export interface ExtendedScreenContextType extends ScreenContextType {
  currentScreen: Screen;
  // 第2引数に任意のデータ（any または record）を追加
  navigateToWithParams: (screen: Screen, params?: any) => void; 
  // 現在の画面に渡されたパラメータを保持する変数を追加しておくと便利
  screenParams?: any; 
}
