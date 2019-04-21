import * as CryptoJS from "crypto-js"
import * as fs from "fs"

const keySize = 256
const iterations = 100
const keyFilename = "voter.json"

import {
  generateWallet,
  generateWalletFromSeed,
  standardRandomBytesFunc
} from "./wallet"

export function storeKeys(keys) {
  fs.writeFileSync(keyFilename, JSON.stringify(keys))
}
export function loadKeys() {
  try {
    return JSON.parse(fs.readFileSync(keyFilename, 'utf8') || `[]`)
  }
  catch(UnhandledPromiseRejectionWarning) {
    return []
  }
}

export function getKey(name, password) {
  const keys = loadKeys()
  const key = keys.find(key => key.name === name)
  try {
    const decrypted = decrypt(key.wallet, password)
    const wallet = JSON.parse(decrypted)
    
    return wallet
  } catch (err) {
    throw new Error(`Incorrect password`)
  }
}

function setKey(wallet, name, password) {
  const keys = []
  
  if (keys.find(key => key.name === name))
  throw new Error(`Key with that name already exists`)
  
  const ciphertext = encrypt(JSON.stringify(wallet), password)
  
  keys.push({
    name,
    address: wallet.terraAddress,
    wallet: ciphertext
  })
  
  fs.writeFileSync(keyFilename, JSON.stringify(keys))
}

export function testPassword(name, password) {
  const keys = loadKeys()
  
  const key = keys.find(key => key.name === name)
  try {
    // try to decode and check if is json format to proofs that decoding worked
    const decrypted = decrypt(key.wallet, password)
    JSON.parse(decrypted)
    return true
  } catch (err) {
    return false
  }
}

export function setNewKey(
  name,
  password,
  randomBytesFunc = standardRandomBytesFunc
  ) {
    const wallet = generateWallet(randomBytesFunc)
    setKey(wallet, name, password)
    
    return wallet
  }
  export async function importKey(name, password, seed) {
    const wallet = await generateWalletFromSeed(seed)
    
    setKey(wallet, name, password)
    
    return wallet
  }
  
  // TODO needs proof reading
  function encrypt(msg, pass) {
    const salt = CryptoJS.lib.WordArray.random(128 / 8)
    
    const key = CryptoJS.PBKDF2(pass, salt, {
      keySize: keySize / 32,
      iterations: iterations
    })
    
    const iv = CryptoJS.lib.WordArray.random(128 / 8)
    
    const encrypted = CryptoJS.AES.encrypt(msg, key, {
      iv: iv,
      padding: CryptoJS.pad.Pkcs7,
      mode: CryptoJS.mode.CBC
    })
    
    // salt, iv will be hex 32 in length
    // append them to the ciphertext for use  in decryption
    const transitmessage = salt.toString() + iv.toString() + encrypted.toString()
    return transitmessage
  }
  
  function decrypt(transitmessage, pass) {
    const salt = CryptoJS.enc.Hex.parse(transitmessage.substr(0, 32))
    const iv = CryptoJS.enc.Hex.parse(transitmessage.substr(32, 32))
    const encrypted = transitmessage.substring(64)
    
    const key = CryptoJS.PBKDF2(pass, salt, {
      keySize: keySize / 32,
      iterations: iterations
    })
    
    const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
      iv: iv,
      padding: CryptoJS.pad.Pkcs7,
      mode: CryptoJS.mode.CBC
    }).toString(CryptoJS.enc.Utf8)
    return decrypted
  }
  