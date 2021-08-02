import NfcManager from 'react-native-nfc-manager';
import Helpers from './Helpers';
import lib from './cc';
import goodOne from './goodOne';

class NfcProxy {
  uid = [];
  data = [];
  thune = 0;
  enc = null;
  dec = null;
  static instance = null;

  static getInstance() {
    if (this.instance === null) {
      this.instance = new NfcProxy();
    }

    return this.instance;
  }

  constructor() {
    this.enc = lib._malloc(1024);
    this.dec = lib._malloc(1024);
    this.readTag = this.readTag.bind(this);
  }

  async writeSector(sector, data) {
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
        Helpers.toDec(data[i]),
      );
      console.log(
        'sector ' + sector + ' block ' + (blockIndex + i) + '  written',
      );
    }
  }

  async readTag() {
    try {
      let data = [];
      for (let i = 0; i < 16; i++) {
        const sector = await NfcProxy.getSector(i);
        data = [...data, ...sector];
      }
      lib.HEAPU8.set(data, this.enc);
      lib._decrypt_dump(this.enc, this.dec);
      this.data = new Uint8Array(lib.HEAPU8.buffer, this.dec, 1024);
      const thunesBlock1 = this.data[592] | (this.data[593] << 8);
      const thunesBlock2 = this.data[672] | (this.data[673] << 8);
      this.thune = thunesBlock2 < thunesBlock1 ? thunesBlock2 : thunesBlock1;
      this.uid = this.data.slice(0, 16);
      // console.log(Helpers.toHex(this.data)); // <- Decrypted hex data
    } catch (e) {
      console.log('wesh');
      throw new Error();
    }
  }

  async patchThunes(amount) {
    const thunes = Number.parseInt(amount * 100, 10);
    lib._patch_decrypted_dump(this.dec, thunes);
    lib._encrypt_dump(this.dec, this.enc);
    const encrypted = new Uint8Array(lib.HEAPU8.buffer, this.enc, 1024);

    await this.writeSector(9, Helpers.dataToHex(9, encrypted));
    await this.writeSector(10, Helpers.dataToHex(10, encrypted));
    await this.writeSector(11, Helpers.dataToHex(11, encrypted));

    this.thune = thunes;
  }

  static async getSector(sector) {
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

  async repair() {
    const data = [...this.uid, ...goodOne.slice(16)];
    lib.HEAPU8.set(data, this.dec);
    await this.patchThunes(1);
  }
}

export default NfcProxy;
