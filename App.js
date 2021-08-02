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
  TextInput,
  TouchableOpacity,
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
import NfcProxy from './NfcProxy';
import Snackbar from 'react-native-snackbar';
import Helpers from './Helpers';

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
    NfcManager.setEventListener(NfcEvents.SessionClosed, () => {
      //cleanUp();
      console.log('lol nope');
      if (!tagFound) {
        resolve();
      }
    });

    NfcManager.registerTagEvent();
  });
}

const App: () => Node = () => {
  const [badgeConnected, setBadgeConnected] = React.useState(false);
  const [amount, setAmount] = React.useState(0);
  const [thunes, setThunes] = React.useState(0);
  const nfcProxy = NfcProxy.getInstance();

  // .then(() => {
  //     NfcManager.requestTechnology([NfcTech.MifareClassic], {
  //       alertMessage: 'Ready to do some custom Mifare cmd!',
  //     })

  const reset = async () => {
    setBadgeConnected(false);
    setThunes(0);
    await NfcManager.cancelTechnologyRequest();
    onTag();
  };

  const onTag = () => {
    NfcManager.requestTechnology([NfcTech.MifareClassic], {
      alertMessage: 'Ready to do some custom Mifare cmd!',
    })
      .then(() => {
        setBadgeConnected(true);
        nfcProxy
          .readTag()
          .then(() => {
            console.log('thunas', nfcProxy.thune);
            setThunes(nfcProxy.thune);
          })
          .catch(e => {
            console.log('oh puteine', e);
            setBadgeConnected(false);
            reset();
            Snackbar.show({
              text: 'Connexion perdu',
              duration: Snackbar.LENGTH_SHORT,
            });
          });
      })
      .catch(e => {
        Snackbar.show({
          text: 'Connexion perdu',
          duration: Snackbar.LENGTH_SHORT,
        });
        console.log('wow pelo', e);
        reset();
      });
  };

  const h4ck = async () => {
    try {
      await nfcProxy.patchThunes(amount);
      Snackbar.show({
        text: 'Badge écrit',
        duration: Snackbar.LENGTH_LONG,
      });
      setThunes(nfcProxy.thune);
    } catch (e) {
      Snackbar.show({
        text: 'Connexion perdu',
        duration: Snackbar.LENGTH_SHORT,
      });
      reset();
    }
  };

  const fix = async () => {
    try {
      await nfcProxy.repair();
      setThunes(nfcProxy.thune);
    } catch (e) {
      Snackbar.show({
        text: 'Connexion perdu',
        duration: Snackbar.LENGTH_SHORT,
      });
      reset();
    }
  };

  const onChangeAmount = value => {
    if (value > 327) {
      value = 327;
    }
    setAmount(value);
  };

  useEffect(() => {
    initNfc().then(() => {
      console.log('ready');
      onTag();
    });
  }, []);
  return (
    <SafeAreaView style={{backgroundColor: Colors.darker}}>
      <View style={{height: '100%'}}>
        <StatusBar barStyle="dark-content" />
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          style={{backgroundColor: Colors.darker}}>
          <View>
            <Text style={styles.title}>0xBADCAFE</Text>
          </View>
          <View
            style={{
              backgroundColor: Colors.black,
            }}>
            <View
              style={{
                backgroundColor: badgeConnected ? '#0f0' : '#f00',
              }}>
              {badgeConnected ? (
                <Text style={styles.badgeView}>Badge connecté</Text>
              ) : (
                <Text style={styles.badgeView}>Badge non connecté</Text>
              )}
            </View>
            {/*<Button onPress={nfcProxy.readTag} title="oui">*/}
            {/*  Lol*/}
            {/*</Button>*/}
            <View style={styles.form}>
              <Text style={styles.instruction}>Montant à insérer</Text>
              <TextInput
                style={styles.input}
                keyboardType={'number-pad'}
                onChangeText={onChangeAmount}
                value={amount.toString()}
              />
              {badgeConnected && (
                <View style={styles.money}>
                  <Text style={styles.moneyText}>
                    {Helpers.toEuros(thunes)}
                  </Text>
                  <View style={styles.btns}>
                    <TouchableOpacity style={styles.hack} onPress={h4ck}>
                      <Text style={styles.hackText}>H4CK</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{...styles.hack, ...styles.fix}}
                      onPress={fix}>
                      <Text style={styles.hackText}>FIX</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
        <TouchableOpacity style={styles.reset} onPress={reset}>
          <Text style={styles.resetText}>RESET</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 48,
    textAlign: 'center',
    backgroundColor: '#000',
    padding: 15,
    color: '#0f0',
  },
  badgeView: {
    fontSize: 16,
    padding: 5,
    textAlign: 'center',
    color: '#fff',
  },
  form: {
    display: 'flex',
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 40,
    backgroundColor: Colors.darker,
    paddingHorizontal: 24,
    textAlign: 'center',
  },
  input: {
    borderColor: '#474747',
    borderRadius: 15,
    textAlign: 'center',
    borderWidth: 2,
    fontSize: 36,
    width: 150,
    height: 70,
  },
  instruction: {
    color: '#474747',
  },
  reset: {
    position: 'absolute',
    right: 15,
    bottom: 15,
    height: 50,
    borderRadius: 15,
    width: 150,
    backgroundColor: '#ce8e2b',
  },
  resetText: {
    textAlign: 'center',
    lineHeight: 50,
    fontSize: 28,
    color: '#fff',
  },
  money: {
    marginTop: 50,
    display: 'flex',
    width: '100%',
    padding: 15,
    backgroundColor: '#2f2f2f',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.36,
    shadowRadius: 6.68,

    elevation: 11,
  },
  moneyText: {
    textAlign: 'center',
    fontSize: 36,
    color: '#0f0',
    marginBottom: 50,
  },
  btns: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hack: {
    backgroundColor: '#f00',
    width: '45%',
    height: 70,
    borderRadius: 15,
  },
  fix: {
    backgroundColor: '#cfd400',
  },
  hackText: {
    lineHeight: 70,
    textAlign: 'center',
    fontSize: 28,
    color: '#fff',
  },
});

export default App;
