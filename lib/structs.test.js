'use strict';

/* eslint-env mocha */
var assert = require('assert');
var Fcbuffer = require('xmaxjs-fcbuffer-lib');

var XMax = require('.');

describe('shorthand', function () {

  it('asset', function () {
    var xmax = XMax.Localnet();
    var types = xmax.fc.types;

    var AssetType = types.asset();

    assertSerializer(AssetType, '1.0000 XMX');

    var obj = AssetType.fromObject('1 XMX');
    assert.equal(obj, '1.0000 XMX');

    var obj2 = AssetType.fromObject({ amount: 10000, symbol: 'XMX' });
    assert.equal(obj, '1.0000 XMX');
  });

  it('authority', function () {
    var xmax = XMax.Localnet();
    var authority = xmax.fc.structs.authority;


    var pubkey = 'XMX6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV';
    var auth = { threshold: 1, keys: [{ key: pubkey, weight: 1 }], accounts: [] };

    assert.deepEqual(authority.fromObject(pubkey), auth);
    assert.deepEqual(authority.fromObject(auth), auth);
  });

  it('PublicKey sorting', function () {
    var xmax = XMax.Localnet();
    var authority = xmax.fc.structs.authority;


    var pubkeys = ['XMX7wBGPvBgRVa4wQN2zm5CjgBF6S7tP7R3JavtSa2unHUoVQGhey', 'XMX6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV'];

    var authSorted = { threshold: 1, keys: [{ key: pubkeys[1], weight: 1 }, { key: pubkeys[0], weight: 1 }], accounts: [] };

    var authUnsorted = { threshold: 1, keys: [{ key: pubkeys[0], weight: 1 }, { key: pubkeys[1], weight: 1 }], accounts: []

      // assert.deepEqual(authority.fromObject(pubkey), auth)
    };assert.deepEqual(authority.fromObject(authUnsorted), authSorted);
  });

  it('public_key', function () {
    var xmax = XMax.Localnet();
    var _xmax$fc = xmax.fc,
        structs = _xmax$fc.structs,
        types = _xmax$fc.types;

    var PublicKeyType = types.public_key();
    var pubkey = 'XMX6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV';
    // 02c0ded2bc1f1305fb0faac5e6c03ee3a1924234985427b6167ca569d13df435cf
    assertSerializer(PublicKeyType, pubkey);
  });

  it('asset_symbol', function () {
    var xmax = XMax.Localnet();
    var types = xmax.fc.types;

    var AssetSymbolType = types.asset_symbol();

    assertSerializer(AssetSymbolType, 'XMX');

    var obj = AssetSymbolType.fromObject('XMX');
    var buf = Fcbuffer.toBuffer(AssetSymbolType, obj);
    assert.equal(buf.toString('hex'), '04584d5800000000');
  });
});

describe('Message.data', function () {
  it('json', function () {
    var xmax = XMax.Localnet({ forceMessageDataHex: false });
    var _xmax$fc2 = xmax.fc,
        structs = _xmax$fc2.structs,
        types = _xmax$fc2.types;

    var value = {
      code: 'xmax',
      type: 'transfer',
      data: {
        from: 'testera',
        to: 'testerb',
        amount: '1',
        memo: ''
      },
      authorization: []
    };
    assertSerializer(structs.message, value);
  });

  it('hex', function () {
    var xmax = XMax.Localnet({ forceMessageDataHex: false, debug: false });
    var _xmax$fc3 = xmax.fc,
        structs = _xmax$fc3.structs,
        types = _xmax$fc3.types;


    var tr = { from: 'testera', to: 'testerb', amount: '1', memo: '' };
    var hex = Fcbuffer.toBuffer(structs.transfer, tr).toString('hex');
    // const lenPrefixHex = Number(hex.length / 2).toString(16) + hex.toString('hex')

    var value = {
      code: 'xmax',
      type: 'transfer',
      data: hex,
      authorization: []
    };

    var type = structs.message;
    var obj = type.fromObject(value); // tests fromObject
    var buf = Fcbuffer.toBuffer(type, obj); // tests appendByteBuffer
    var obj2 = Fcbuffer.fromBuffer(type, buf); // tests fromByteBuffer
    var obj3 = type.toObject(obj); // tests toObject

    assert.deepEqual(Object.assign({}, value, { data: tr }), obj3, 'serialize object');
    assert.deepEqual(obj3, obj2, 'serialize buffer');
  });

  it('force hex', function () {
    var xmax = XMax.Localnet({ forceMessageDataHex: true });
    var _xmax$fc4 = xmax.fc,
        structs = _xmax$fc4.structs,
        types = _xmax$fc4.types;

    var value = {
      code: 'xmax',
      type: 'transfer',
      data: {
        from: 'testera',
        to: 'testerb',
        amount: '1',
        memo: ''
      },
      authorization: []
    };
    var type = structs.message;
    var obj = type.fromObject(value); // tests fromObject
    var buf = Fcbuffer.toBuffer(type, obj); // tests appendByteBuffer
    var obj2 = Fcbuffer.fromBuffer(type, buf); // tests fromByteBuffer
    var obj3 = type.toObject(obj); // tests toObject

    var data = Fcbuffer.toBuffer(structs.transfer, value.data);
    var dataHex = //Number(data.length).toString(16) + 
    data.toString('hex');

    assert.deepEqual(Object.assign({}, value, { data: dataHex }), obj3, 'serialize object');
    assert.deepEqual(obj3, obj2, 'serialize buffer');
  });

  it('unknown type', function () {
    var xmax = XMax.Localnet({ forceMessageDataHex: false });
    var _xmax$fc5 = xmax.fc,
        structs = _xmax$fc5.structs,
        types = _xmax$fc5.types;

    var value = {
      code: 'xmax',
      type: 'mytype',
      data: '030a0b0c',
      authorization: []
    };
    assertSerializer(structs.message, value);
  });
});

function assertSerializer(type, value) {
  var obj = type.fromObject(value); // tests fromObject
  var buf = Fcbuffer.toBuffer(type, obj); // tests appendByteBuffer
  var obj2 = Fcbuffer.fromBuffer(type, buf); // tests fromByteBuffer
  var obj3 = type.toObject(obj); // tests toObject

  assert.deepEqual(value, obj3, 'serialize object');
  assert.deepEqual(obj3, obj2, 'serialize buffer');
}