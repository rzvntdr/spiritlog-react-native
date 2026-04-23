import { requireNativeModule, Platform } from 'expo-modules-core';

const DndModule = Platform.OS === 'android' ? requireNativeModule('Dnd') : null;

export function isAccessGranted(): boolean {
  return DndModule?.isAccessGranted() ?? false;
}

export function requestAccess(): void {
  DndModule?.requestAccess();
}

export function enableDnd(): void {
  DndModule?.enableDnd();
}

export function disableDnd(): void {
  DndModule?.disableDnd();
}
