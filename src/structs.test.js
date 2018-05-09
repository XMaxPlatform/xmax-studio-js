/* eslint-env mocha */
const assert = require('assert')
const Fcbuffer = require('xmaxjs-fcbuffer')

const XMax = require('.')

describe('shorthand', () => {

    it('asset', () => {
      const xmax = XMax.Localnet()
      const {types} = xmax.fc
      const AssetType = types.asset()
  
      assertSerializer(AssetType, '1.0000 XMX')
  
      const obj = AssetType.fromObject('1 XMX')
      assert.equal(obj, '1.0000 XMX')
  
      const obj2 = AssetType.fromObject({amount: 10000, symbol: 'XMX'})
      assert.equal(obj, '1.0000 XMX')
    })
  
    it('authority', () => {
      const xmax = XMax.Localnet()
      const {authority} = xmax.fc.structs
  
      const pubkey = 'XMX6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV'
      const auth = {threshold: 1, keys: [{key: pubkey, weight: 1}], accounts: []}
  
      assert.deepEqual(authority.fromObject(pubkey), auth)
      assert.deepEqual(authority.fromObject(auth), auth)
    })
  
    it('PublicKey sorting', () => {
      const xmax = XMax.Localnet()
      const {authority} = xmax.fc.structs
  
      const pubkeys = [
        'XMX7wBGPvBgRVa4wQN2zm5CjgBF6S7tP7R3JavtSa2unHUoVQGhey',
        'XMX6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV'
      ]
  
      const authSorted = {threshold: 1, keys: [
        {key: pubkeys[1], weight: 1},
        {key: pubkeys[0], weight: 1}
      ], accounts: []}
  
      const authUnsorted = {threshold: 1, keys: [
        {key: pubkeys[0], weight: 1},
        {key: pubkeys[1], weight: 1}
      ], accounts: []}
  
      // assert.deepEqual(authority.fromObject(pubkey), auth)
      assert.deepEqual(authority.fromObject(authUnsorted), authSorted)
    })
  
    it('public_key', () => {
      const xmax = XMax.Localnet()
      const {structs, types} = xmax.fc
      const PublicKeyType = types.public_key()
      const pubkey = 'XMX6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV'
      // 02c0ded2bc1f1305fb0faac5e6c03ee3a1924234985427b6167ca569d13df435cf
      assertSerializer(PublicKeyType, pubkey)
    })
  
    it('asset_symbol', () => {
      const xmax = XMax.Localnet()
      const {types} = xmax.fc
      const AssetSymbolType = types.asset_symbol()
  
      assertSerializer(AssetSymbolType, 'XMX')
  
      const obj = AssetSymbolType.fromObject('XMX')
      const buf = Fcbuffer.toBuffer(AssetSymbolType, obj)
      assert.equal(buf.toString('hex'), '04584d5800000000')
    })
  
  })

  describe('Message.data', () => {
    it('json', () => {
      const xmax = XMax.Localnet({forceMessageDataHex: false})
      const {structs, types} = xmax.fc
      const value = {
        code: 'xmax',
        type: 'transfer',
        data: {
          from: 'testera',
          to: 'testerb',
          amount: '1',
          memo: ''
        },
        authorization: []
      }
      assertSerializer(structs.message, value)
    })
  
    it('hex', () => {
      const xmax = XMax.Localnet({forceMessageDataHex: false, debug: false})
      const {structs, types} = xmax.fc
  
      const tr = {from: 'testera', to: 'testerb', amount: '1', memo: ''}
      const hex = Fcbuffer.toBuffer(structs.transfer, tr).toString('hex')
      // const lenPrefixHex = Number(hex.length / 2).toString(16) + hex.toString('hex')
  
      const value = {
        code: 'xmax',
        type: 'transfer',
        data: hex,
        authorization: []
      }
      
      const type = structs.message
      const obj = type.fromObject(value) // tests fromObject
      const buf = Fcbuffer.toBuffer(type, obj) // tests appendByteBuffer
      const obj2 = Fcbuffer.fromBuffer(type, buf) // tests fromByteBuffer
      const obj3 = type.toObject(obj) // tests toObject
  
      assert.deepEqual(Object.assign({}, value, {data: tr}), obj3, 'serialize object')
      assert.deepEqual(obj3, obj2, 'serialize buffer')
    })
  
    it('force hex', () => {
      const xmax = XMax.Localnet({forceMessageDataHex: true})
      const {structs, types} = xmax.fc
      const value = {
        code: 'xmax',
        type: 'transfer',
        data: {
          from: 'testera',
          to: 'testerb',
          amount: '1',
          memo: ''
        },
        authorization: []
      }
      const type = structs.message
      const obj = type.fromObject(value) // tests fromObject
      const buf = Fcbuffer.toBuffer(type, obj) // tests appendByteBuffer
      const obj2 = Fcbuffer.fromBuffer(type, buf) // tests fromByteBuffer
      const obj3 = type.toObject(obj) // tests toObject
  
      const data = Fcbuffer.toBuffer(structs.transfer, value.data)
      const dataHex = //Number(data.length).toString(16) + 
        data.toString('hex')
  
      assert.deepEqual(Object.assign({}, value, {data: dataHex}), obj3, 'serialize object')
      assert.deepEqual(obj3, obj2, 'serialize buffer')
    })
  
    it('unknown type', () => {
      const xmax = XMax.Localnet({forceMessageDataHex: false})
      const {structs, types} = xmax.fc
      const value = {
        code: 'xmax',
        type: 'mytype',
        data: '030a0b0c',
        authorization: []
      }
      assertSerializer(structs.message, value)
    })
  })
  
  
function assertSerializer (type, value) {
    const obj = type.fromObject(value) // tests fromObject
    const buf = Fcbuffer.toBuffer(type, obj) // tests appendByteBuffer
    const obj2 = Fcbuffer.fromBuffer(type, buf) // tests fromByteBuffer
    const obj3 = type.toObject(obj) // tests toObject
  
    assert.deepEqual(value, obj3, 'serialize object')
    assert.deepEqual(obj3, obj2, 'serialize buffer')
  }
  