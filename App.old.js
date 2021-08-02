/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React, {useEffect} from 'react';
import type {Node} from 'react';
import NfcManager, {NfcEvents, NfcTech} from 'react-native-nfc-manager';
import lib from './cc';
import {
  Button,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';

import {
  Colors,
  DebugInstructions,
  Header,
  LearnMoreLinks,
  ReloadInstructions,
} from 'react-native/Libraries/NewAppScreen';

const Section = ({children, title}): Node => {
  const isDarkMode = true; //useColorScheme() === 'dark';
  return (
    <View style={styles.sectionContainer}>
      <Text
        style={[
          styles.sectionTitle,
          {
            color: isDarkMode ? Colors.white : Colors.black,
          },
        ]}>
        {title}
      </Text>
      <Text
        style={[
          styles.sectionDescription,
          {
            color: isDarkMode ? Colors.light : Colors.dark,
          },
        ]}>
        {children}
      </Text>
    </View>
  );
};

async function initNfc() {
  await NfcManager.start();
}

function readNdef() {
  const cleanUp = () => {
    NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
    NfcManager.setEventListener(NfcEvents.SessionClosed, null);
  };

  return new Promise(resolve => {
    let tagFound = null;

    NfcManager.setEventListener(NfcEvents.DiscoverTag, tag => {
      tagFound = tag;
      NfcManager.setAlertMessage('NDEF tag found');
      resolve(tagFound);
      // NfcManager.unregisterTagEvent().catch(() => 0);
    });
    /*
    NfcManager.setEventListener(NfcEvents.SessionClosed, () => {
      //cleanUp();
      if (!tagFound) {
        resolve();
      }
    });*/

    NfcManager.registerTagEvent();
  });
}

function normalize(str) {
  if (str.length === 1) {
    return '0' + str;
  }
  return str;
}

function toHex(arr, lineBreak = true) {
  let hex = '';
  let index = 0;
  for (const v of arr) {
    hex += normalize(v.toString(16));
    index++;
    if (index === 16 && lineBreak) {
      hex += '\n';
      index = 0;
    }
  }

  return hex.toUpperCase();
}

const sector9 = [
  '1E354DA6A4151B7DD324CAD1A33B6790',
  'B069C2AD6D9BE9A602EA09229FD2FC6E',
  '496AB0AF3A7D16A1E2D4E0F6C111FE78',
  'A0A1A2A3A4A50F00FFFF415A54454B4D',
];

const sector10 = [
  'CD73AFD02E121BE7A2F60BCED5A97F3B',
  'E95FEAB1AB693AEAD324CAD1A33B6790',
  '5C6945F6AF835B9702EA09229FD2FC6E',
  'A0A1A2A3A4A50F00FFFF415A54454B4D',
];

const sector11 = [
  '496AB0AF3A7D16A1E2D4E0F6C111FE78',
  'CD73AFD02E121BE7C28B1C488E0A70C7',
  '34F1774B376DB3BACD73AFD02E121BE7',
  'A0A1A2A3A4A50F00FFFF415A54454B4D',
];

function toDec(text) {
  let start = 0;
  let end = 2;
  let result = [];

  let val = '';
  do {
    val = text.slice(start, end);
    start += 2;
    end += 2;
    if (val !== '') {
      result.push(parseInt(val, 16));
    }
  } while (val !== '');

  return result;
}

function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function writeSector(sector, data) {
  const a =
    await NfcManager.mifareClassicHandlerAndroid.mifareClassicAuthenticateA(
      sector,
      [160, 161, 162, 163, 164, 165],
    );
  const b =
    await NfcManager.mifareClassicHandlerAndroid.mifareClassicAuthenticateB(
      sector,
      [65, 90, 84, 69, 75, 77],
    );

  const blockIndex =
    await NfcManager.mifareClassicHandlerAndroid.mifareClassicSectorToBlock(
      sector,
    );
  console.log(blockIndex);

  for (let i = 0; i < 3; i++) {
    console.log('wow', blockIndex + i);
    await NfcManager.mifareClassicHandlerAndroid.mifareClassicWriteBlock(
      blockIndex + i,
      toDec(data[i]),
    );
    console.log(
      'sector ' + sector + ' block ' + (blockIndex + i) + '  written',
    );
  }
}

function dataToHex(sector, data) {
  let hex = [];

  for (let a = 0; a < 3; a++) {
    let start = sector * 4 * 16 + 16 * a;
    let line = [];
    for (let i = 0; i < 16; i++) {
      line.push(data[start + i]);
    }
    hex.push(toHex(line, false));
  }
  return hex;
}

async function getSector(sector) {
  let keyA = [255, 255, 255, 255, 255, 255];
  let keyB = [255, 255, 255, 255, 255, 255];
  if (sector >= 8 && sector !== 15) {
    keyA = [160, 161, 162, 163, 164, 165];
    keyB = [65, 90, 84, 69, 75, 77];
  }
  await NfcManager.mifareClassicHandlerAndroid.mifareClassicAuthenticateA(
    sector,
    keyA,
  );
  await NfcManager.mifareClassicHandlerAndroid.mifareClassicAuthenticateB(
    sector,
    keyB,
  );
  return await NfcManager.mifareClassicHandlerAndroid.mifareClassicReadSector(
    sector,
  );
}

async function readTag() {
  try {
    console.log('yo');
    let tag = null;
    /* await NfcManager.requestTechnology([NfcTech.MifareClassic], {
      alertMessage: 'Ready to do some custom Mifare cmd!',
    });*/
    console.log('mdr');
    tag = await NfcManager.getTag();
    const block =
      NfcManager.mifareUltralightHandlerAndroid.mifareClassicReadBlock(0);
    console.log('block', block);
    console.log('tag', tag);
    const a =
      await NfcManager.mifareClassicHandlerAndroid.mifareClassicAuthenticateA(
        9,
        [160, 161, 162, 163, 164, 165],
      );
    const b =
      await NfcManager.mifareClassicHandlerAndroid.mifareClassicAuthenticateB(
        9,
        [65, 90, 84, 69, 75, 77],
      );
    console.log(a, b);
    const sector =
      await NfcManager.mifareClassicHandlerAndroid.mifareClassicGetSectorCount();
    //NfcManager.mifareClassicHandlerAndroid.mifareClassicWriteBlock(9, toDec(sector9);
    console.log('read', sector);
    // console.log(toHex(sector));
  } catch (e) {
    console.log(e);
  }
  //NfcManager.cancelTechnologyRequest();
}

const goodOne = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 0, 0, 0, 0, 0, 0,
  255, 7, 128, 240, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 0, 0, 0, 0, 0, 0,
  255, 7, 128, 225, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 0, 0, 0, 0, 0, 0,
  255, 7, 128, 210, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 0, 0, 0, 0, 0, 0,
  255, 7, 128, 195, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 0, 0, 0, 0, 0, 0,
  255, 7, 128, 180, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 0, 0, 0, 0, 0, 0,
  255, 7, 128, 165, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 0, 0, 0, 0, 0, 0,
  255, 7, 128, 150, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 0, 0, 0, 0, 0, 0,
  255, 7, 128, 135, 255, 255, 255, 255, 255, 255, 76, 85, 88, 47, 85, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 40, 67, 36, 2, 4, 16, 43, 16, 43, 16, 0, 0, 0, 0, 0, 0, 105,
  76, 46, 2, 4, 10, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 105, 114, 0, 0, 0, 0, 0, 0,
  15, 0, 255, 255, 0, 0, 0, 0, 0, 0, 121, 5, 199, 98, 0, 219, 27, 88, 33, 6, 84,
  20, 0, 53, 1, 0, 220, 5, 0, 0, 0, 0, 8, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 127,
  127, 127, 127, 127, 31, 31, 31, 1, 0, 255, 3, 32, 0, 0, 0, 0, 0, 0, 0, 15, 0,
  255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 173, 42,
  120, 5, 199, 98, 0, 219, 26, 137, 33, 6, 84, 20, 0, 53, 1, 0, 220, 5, 0, 0, 0,
  0, 8, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 255, 255, 0, 0, 0,
  0, 0, 0, 0, 0, 127, 127, 127, 127, 127, 31, 31, 31, 1, 0, 255, 3, 32, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 173, 42, 1, 0, 0, 0, 0, 0, 1, 209, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 255, 255, 0, 0, 0, 0, 0, 0, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 0, 0, 0, 0, 0, 0, 15, 0, 255, 255, 0, 0, 0, 0, 0, 0, 47, 57, 114,
  109, 43, 219, 100, 64, 205, 115, 175, 208, 46, 18, 27, 231, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 0, 0, 0,
  0, 0, 0, 15, 0, 255, 255, 0, 0, 0, 0, 0, 0, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 0, 0, 0, 0, 0, 0, 15,
  0, 255, 255, 0, 0, 0, 0, 0, 0, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 0, 0, 0, 0, 0, 0, 255, 7, 128,
  15, 255, 255, 255, 255, 255, 255,
];

const App: () => Node = () => {
  const isDarkMode = true; //useColorScheme() === 'dark';

  const dump = Uint8Array.from([
    0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x10, 0x11, 0x12,
    0x13, 0x14, 0x15, 0x16, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x07, 0x80, 0xf0, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x07,
    0x80, 0xe1, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0x07, 0x80, 0xd2, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x07, 0x80, 0xc3, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x07,
    0x80, 0xb4, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0x07, 0x80, 0xa5, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x07, 0x80, 0x96, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x07,
    0x80, 0x87, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xa5, 0xd4, 0xfd, 0x9a,
    0xcb, 0x71, 0xf1, 0x8f, 0x73, 0x03, 0x14, 0xa0, 0x50, 0x20, 0xc6, 0xd3,
    0x9b, 0x63, 0x77, 0xb2, 0x3e, 0xda, 0x7b, 0xf5, 0xed, 0x03, 0x43, 0x29,
    0x81, 0xe3, 0x4d, 0xb8, 0xb7, 0xef, 0xf0, 0x85, 0xa0, 0xb2, 0x2e, 0x44,
    0xcf, 0x2e, 0x4c, 0x8a, 0x0b, 0x8e, 0x18, 0x5a, 0xa0, 0xa1, 0xa2, 0xa3,
    0xa4, 0xa5, 0x0f, 0x00, 0xff, 0xff, 0x41, 0x5a, 0x54, 0x45, 0x4b, 0x4d,
    0xab, 0xf8, 0xd9, 0xa4, 0xdf, 0x5e, 0xfa, 0xdb, 0x04, 0x01, 0x85, 0xdf,
    0x36, 0x39, 0x76, 0xac, 0x15, 0x04, 0x10, 0x9c, 0x45, 0x1b, 0x7d, 0x5d,
    0x02, 0xea, 0x09, 0x22, 0x9f, 0xd2, 0xfc, 0x6e, 0x49, 0x6a, 0xb0, 0xaf,
    0x3a, 0x7d, 0x16, 0xa1, 0xe2, 0xd4, 0xe0, 0xf6, 0xc1, 0x11, 0xfe, 0x78,
    0xa0, 0xa1, 0xa2, 0xa3, 0xa4, 0xa5, 0x0f, 0x00, 0xff, 0xff, 0x41, 0x5a,
    0x54, 0x45, 0x4b, 0x4d, 0xcd, 0x73, 0xaf, 0xd0, 0x2e, 0x12, 0x1b, 0xe7,
    0x9a, 0xe2, 0xa4, 0x82, 0x02, 0xdc, 0x54, 0x00, 0x51, 0xe8, 0xc0, 0xd0,
    0x67, 0xf6, 0x5f, 0xa9, 0xdd, 0x60, 0xaf, 0xa5, 0xad, 0xce, 0xf8, 0x7f,
    0x0c, 0xae, 0xb3, 0x9a, 0x04, 0x76, 0xe3, 0x13, 0x02, 0xea, 0x09, 0x22,
    0x9f, 0xd2, 0xfc, 0x6e, 0xa0, 0xa1, 0xa2, 0xa3, 0xa4, 0xa5, 0x0f, 0x00,
    0xff, 0xff, 0x41, 0x5a, 0x54, 0x45, 0x4b, 0x4d, 0x49, 0x6a, 0xb0, 0xaf,
    0x3a, 0x7d, 0x16, 0xa1, 0xfe, 0x23, 0x9a, 0x85, 0xf0, 0x0b, 0x75, 0xf1,
    0xcd, 0x73, 0xaf, 0xd0, 0x2e, 0x12, 0x1b, 0xe7, 0x72, 0xdc, 0x78, 0x29,
    0x89, 0xd0, 0xac, 0xb9, 0x34, 0xf1, 0x77, 0x4b, 0x37, 0x6d, 0xb3, 0xba,
    0xcd, 0x73, 0xaf, 0xd0, 0x2e, 0x12, 0x1b, 0xe7, 0xa0, 0xa1, 0xa2, 0xa3,
    0xa4, 0xa5, 0x0f, 0x00, 0xff, 0xff, 0x41, 0x5a, 0x54, 0x45, 0x4b, 0x4d,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xa0, 0xa1, 0xa2, 0xa3, 0xa4, 0xa5, 0x0f, 0x00, 0xff, 0xff, 0x41, 0x5a,
    0x54, 0x45, 0x4b, 0x4d, 0x2f, 0x39, 0x72, 0x6d, 0x2b, 0xdb, 0x64, 0x40,
    0xcd, 0x73, 0xaf, 0xd0, 0x2e, 0x12, 0x1b, 0xe7, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xa0, 0xa1, 0xa2, 0xa3, 0xa4, 0xa5, 0x0f, 0x00,
    0xff, 0xff, 0x41, 0x5a, 0x54, 0x45, 0x4b, 0x4d, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xa0, 0xa1, 0xa2, 0xa3,
    0xa4, 0xa5, 0x0f, 0x00, 0xff, 0xff, 0x41, 0x5a, 0x54, 0x45, 0x4b, 0x4d,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x07, 0x80, 0x0f, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff,
  ]);

  // Module.onRuntimeInitialized = async _ => {
  const enc = lib._malloc(1024);
  const dec = lib._malloc(1024);

  lib.HEAPU8.set(dump, enc);

  lib._decrypt_dump(enc, dec);

  const r = new Uint8Array(lib.HEAPU8.buffer, dec, 1024);
  console.log(r);
  initNfc();
  readNdef()
    .then(async (...args) => {
      console.log('slt');
      //console.log(args);
    })
    .catch(e => {
      console.log(e);
    });
  NfcManager.requestTechnology([NfcTech.MifareClassic], {
    alertMessage: 'Ready to do some custom Mifare cmd!',
  });

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={backgroundStyle}>
        <Header />
        <Button
          onPress={async () => {
            let data = [];
            for (let i = 0; i < 16; i++) {
              const sector = await getSector(i);
              data = [...data, ...sector];
            }
            console.log(toHex(data));

            lib.HEAPU8.set(data, enc);
            const r1 = new Uint8Array(lib.HEAPU8.buffer, dec, 1024);
            lib._decrypt_dump(enc, dec);
            lib._patch_decrypted_dump(dec, 540);
            // lib.HEAPU8.set(goodOne, dec);
            lib._encrypt_dump(dec, enc);

            // console.log(r1);
            // console.log(toHex(r1))
            const rr = new Uint8Array(lib.HEAPU8.buffer, enc, 1024);
            const r2 = new Uint8Array(lib.HEAPU8.buffer, dec, 1024);
            console.log(toHex(rr));
            console.log(dataToHex(9, rr));
            console.log(r2);
            console.log(toHex(r2));
            //console.log(toHex(data));
            //            await readTag();
            // await writeSector(8, dataToHex(8, rr));
            await writeSector(9, dataToHex(9, rr));
            await writeSector(10, dataToHex(10, rr));
            await writeSector(11, dataToHex(11, rr));
            // await writeSector(13, dataToHex(13, rr));
            //await writeSector(10, sector10);
            //await writeSector(11, sector11);
          }}
          title="Read tag"
          color="#841584"
          accessibilityLabel="read tag"
        />
        <View
          style={{
            backgroundColor: isDarkMode ? Colors.black : Colors.white,
          }}>
          <Section title="Step One">
            Edit <Text style={styles.highlight}>App.js</Text> to change this
            screen and then come back to see your edits.
          </Section>
          <Section title="See Your Changes">
            <ReloadInstructions />
          </Section>
          <Section title="Debug">
            <DebugInstructions />
          </Section>
          <Section title="Learn More">
            Read the docs to discover what to do next:
          </Section>
          <LearnMoreLinks />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
  },
  highlight: {
    fontWeight: '700',
  },
});

export default App;