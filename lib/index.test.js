'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

/* eslint-env mocha */
var assert = require('assert');

var XMax = require('.');
var ecc = XMax.modules.ecc;

var _require = require('xmaxjs-keygen'),
    Keystore = _require.Keystore;

describe('version', function () {
  it('exposes a version number', function () {
    assert.ok(XMax.version);
  });
});

describe('offline', function () {
  var headers = {
    ref_block_num: 1,
    ref_block_prefix: 452435776,
    expiration: new Date().toISOString().split('.')[0]
  };

  it('transaction', function _callee() {
    var privateKey, xmax, memo, trx;
    return regeneratorRuntime.async(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return regeneratorRuntime.awrap(ecc.unsafeRandomKey());

          case 2:
            privateKey = _context.sent;
            xmax = XMax.Localnet({
              keyProvider: privateKey,
              httpEndpoint: 'https://thissiteisnotexist.com.cn',
              transactionHeaders: function transactionHeaders(expireInSeconds, callback) {
                callback(null /*error*/, headers);
              },
              broadcast: false,
              sign: true
            });
            memo = '';
            _context.next = 7;
            return regeneratorRuntime.awrap(xmax.transfer('bankers', 'people', 1000000000000, memo));

          case 7:
            trx = _context.sent;


            assert.deepEqual({
              ref_block_num: trx.transaction.ref_block_num,
              ref_block_prefix: trx.transaction.ref_block_prefix,
              expiration: trx.transaction.expiration
            }, headers);

            assert.equal(trx.transaction.signatures.length, 1, 'expecting 1 signature');

          case 10:
          case 'end':
            return _context.stop();
        }
      }
    }, null, this);
  });
});

// even transactions that don't broadcast require Api lookups
//  no testnet yet, avoid breaking travis-ci
if (process.env['NODE_ENV'] === 'development') {

  describe('networks', function () {
    it('testnet', function (done) {
      var xmax = XMax.Localnet();
      xmax.getBlock(1, function (err, block) {
        if (err) {
          throw err;
        }
        done();
      });
    });
  });

  describe('transactions', function () {
    var wif = '5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3';
    var signProvider = function signProvider(_ref) {
      var sign = _ref.sign,
          buf = _ref.buf;
      return sign(buf, wif);
    };
    var promiseSigner = function promiseSigner(args) {
      return Promise.resolve(signProvider(args));
    };

    it('usage', function () {
      var xmax = XMax.Localnet({ signProvider: signProvider });
      xmax.transfer();
    });

    // A keyProvider can return private keys directly..
    it('keyProvider private key', function () {

      // keyProvider should return an array of keys
      var keyProvider = function keyProvider() {
        return [wif];
      };

      var xmax = XMax.Localnet({ keyProvider: keyProvider });

      return xmax.transfer('testera', 'testerb', 1, '', false).then(function (tr) {
        assert.equal(tr.transaction.signatures.length, 1);
        assert.equal(_typeof(tr.transaction.signatures[0]), 'string');
      });
    });

    // If a keystore is used, the keyProvider should return available
    // public keys first then respond with private keys next.
    it('keyProvider public keys then private key', function () {
      var pubkey = ecc.privateToPublic(wif);

      // keyProvider should return a string or array of keys.
      var keyProvider = function keyProvider(_ref2) {
        var transaction = _ref2.transaction,
            pubkeys = _ref2.pubkeys;

        if (!pubkeys) {
          assert.equal(transaction.messages[0].type, 'transfer');
          return [pubkey];
        }

        if (pubkeys) {
          assert.deepEqual(pubkeys, [pubkey]);
          return [wif];
        }
        assert(false, 'unexpected keyProvider callback');
      };

      var xmax = XMax.Localnet({ keyProvider: keyProvider });

      return xmax.transfer('testera', 'testerb', 9, '', false).then(function (tr) {
        assert.equal(tr.transaction.signatures.length, 1);
        assert.equal(_typeof(tr.transaction.signatures[0]), 'string');
      });
    });

    it('keyProvider from xmaxjs-keygen', function () {
      var keystore = Keystore('uid');
      keystore.deriveKeys({ parent: wif });
      var xmax = XMax.Localnet({ keyProvider: keystore.keyProvider });
      return xmax.transfer('testera', 'testerb', 12, '', true);
    });

    it('signProvider', function () {
      var customSignProvider = function customSignProvider(_ref3) {
        var buf = _ref3.buf,
            sign = _ref3.sign,
            transaction = _ref3.transaction;


        // All potential keys (XMX6MRy.. is the pubkey for 'wif')
        var pubkeys = ['XMX6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV'];

        return xmax.getRequiredKeys(transaction, pubkeys).then(function (res) {
          // Just the required_keys need to sign 
          assert.deepEqual(res.required_keys, pubkeys);
          return sign(buf, wif); // return hex string signature or array of signatures
        });
      };
      var xmax = XMax.Localnet({ signProvider: customSignProvider });
      return xmax.transfer('testera', 'testerb', 2, '', false);
    });

    it('addaccount (broadcast)', function () {
      var xmax = XMax.Localnet({ signProvider: signProvider });
      var pubkey = 'XMX6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV';
      // const auth = {threshold: 1, keys: [{key: pubkey, weight: 1}], accounts: []}
      var name = randomName();

      return xmax.addaccount({
        creator: 'testera',
        name: name,
        owner: pubkey,
        active: pubkey,
        recovery: 'testera',
        deposit: '1.0000 XMX'
      });
    });

    it('mockTransactions pass', function () {
      var xmax = XMax.Localnet({ signProvider: signProvider, mockTransactions: 'pass' });
      return xmax.transfer('testera', 'testerb', 1, '').then(function (transfer) {
        assert(transfer.mockTransaction, 'transfer.mockTransaction');
      });
    });

    it('mockTransactions fail', function () {
      var xmax = XMax.Localnet({ signProvider: signProvider, mockTransactions: 'fail' });
      return xmax.transfer('testera', 'testerb', 1, '').catch(function (error) {
        assert(error.indexOf('fake error') !== -1, 'expecting: fake error');
      });
    });

    it('transfer (broadcast)', function () {
      var xmax = XMax.Localnet({ signProvider: signProvider });
      return xmax.transfer('testera', 'testerb', 1, '');
    });

    it('transfer custom authorization (broadcast)', function () {
      var xmax = XMax.Localnet({ signProvider: signProvider });
      return xmax.transfer('testera', 'testerb', 1, '', { authorization: 'testera@owner' });
    });

    it('transfer custom authorization sorting (no broadcast)', function () {
      var xmax = XMax.Localnet({ signProvider: signProvider });
      return xmax.transfer('testera', 'testerb', 1, '', { authorization: ['testerb@owner', 'testera@owner'], broadcast: false }).then(function (_ref4) {
        var transaction = _ref4.transaction;

        var ans = [{ account: 'testera', permission: 'owner' }, { account: 'testerb', permission: 'owner' }];
        assert.deepEqual(transaction.messages[0].authorization, ans);
      });
    });

    it('transfer custom scope (broadcast)', function () {
      var xmax = XMax.Localnet({ signProvider: signProvider });
      // To pass: testerb, testera must get sorted to: testera, testerb
      return xmax.transfer('testera', 'testerb', 2, '', { scope: ['testerb', 'testera'] });
    });

    it('transfer custom scope array (no broadcast)', function () {
      var xmax = XMax.Localnet({ signProvider: signProvider });
      // To pass: scopes must get sorted
      return xmax.transfer('testera', 'testerb', 1, '', { scope: ['joe', 'billy'], broadcast: false }).then(function (_ref5) {
        var transaction = _ref5.transaction;

        assert.deepEqual(transaction.scope, ['billy', 'joe']);
      });
    });

    it('transfer (no broadcast)', function () {
      var xmax = XMax.Localnet({ signProvider: signProvider });
      return xmax.transfer('testera', 'testerb', 1, '', { broadcast: false });
    });

    it('transfer (no broadcast, no sign)', function () {
      var xmax = XMax.Localnet({ signProvider: signProvider });
      var opts = { broadcast: false, sign: false };
      return xmax.transfer('testera', 'testerb', 1, '', opts).then(function (tr) {
        return assert.deepEqual(tr.transaction.signatures, []);
      });
    });

    it('transfer sign promise (no broadcast)', function () {
      var xmax = XMax.Localnet({ signProvider: promiseSigner });
      return xmax.transfer('testera', 'testerb', 1, '', false);
    });

    it('message to unknown contract', function () {
      var name = 'acdef513521';
      return XMax.Localnet({ signProvider: signProvider }).contract(name).then(function () {
        throw 'expecting error';
      }).catch(function (error) {
        assert(/unknown key/.test(error.toString()), 'expecting "unknown key" error message, instead got: ' + error);
      });
    });

    it('message to contract', function () {
      // testeraPrivate = '5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3'
      // xmax is a bad test case, but it was the only native contract
      var name = 'xmax';
      return XMax.Localnet({ signProvider: signProvider }).contract(name).then(function (contract) {
        contract.transfer('testera', 'testerd', 1, '')
        // transaction sent on each command
        .then(function (tr) {
          assert.equal(1, tr.transaction.messages.length);
        });

        contract.transfer('testerd', 'testera', 1, '').then(function (tr) {
          assert.equal(1, tr.transaction.messages.length);
        });
      }).then(function (r) {
        assert(r == undefined);
      });
    });

    it('message to contract atomic', function () {
      var amt = 1; // for unique transactions
      var testnet = XMax.Localnet({ signProvider: signProvider });

      var trTest = function trTest(xmax) {
        assert(xmax.transfer('testera', 'testerf', amt, '') == null);
        assert(xmax.transfer('testerf', 'testera', amt++, '') == null);
      };

      var assertTr = function assertTr(test) {
        return test.then(function (tr) {
          assert.equal(2, tr.transaction.messages.length);
        });
      };

      //  contracts can be a string or array
      assertTr(testnet.transaction(['xmax'], function (_ref6) {
        var xmax = _ref6.xmax;
        return trTest(xmax);
      }));
      assertTr(testnet.transaction('xmax', function (xmax) {
        return trTest(xmax);
      }));
    });

    it('message to contract (contract tr nesting)', function () {
      var tn = XMax.Localnet({ signProvider: signProvider });
      return tn.contract('xmax').then(function (xmax) {
        xmax.transaction(function (tr) {
          tr.transfer('testera', 'testerd', 1, '');
          tr.transfer('testera', 'testere', 1, '');
        });
        xmax.transfer('testera', 'testerf', 1, '');
      });
    });

    it('multi-message transaction (broadcast)', function () {
      var xmax = XMax.Localnet({ signProvider: signProvider });
      return xmax.transaction(function (tr) {
        assert(tr.transfer('testera', 'testerb', 1, '') == null);
        assert(tr.transfer({ from: 'testera', to: 'testerc', amount: 1, memo: '' }) == null);
      }).then(function (tr) {
        assert.equal(2, tr.transaction.messages.length);
      });
    });

    it('multi-message transaction no inner callback', function () {
      var xmax = XMax.Localnet({ signProvider: signProvider });
      xmax.transaction(function (tr) {
        tr.okproducer('testera', 'testera', 1, function (cb) {});
      }).then(function () {
        throw 'expecting rollback';
      }).catch(function (error) {
        assert(/Callback during a transaction/.test(error), error);
      });
    });

    it('multi-message transaction error rollback', function () {
      var xmax = XMax.Localnet({ signProvider: signProvider });
      return xmax.transaction(function (tr) {
        throw 'rollback';
      }).then(function () {
        throw 'expecting rollback';
      }).catch(function (error) {
        assert(/rollback/.test(error), error);
      });
    });

    it('multi-message transaction Promise.reject rollback', function () {
      var xmax = XMax.Localnet({ signProvider: signProvider });
      xmax.transaction(function (tr) {
        return Promise.reject('rollback');
      }).then(function () {
        throw 'expecting rollback';
      }).catch(function (error) {
        assert(/rollback/.test(error), error);
      });
    });

    it('custom transfer', function () {
      var xmax = XMax.Localnet({ signProvider: signProvider });
      return xmax.transaction({
        scope: ['testera', 'testerb'],
        messages: [{
          code: 'xmax',
          type: 'transfer',
          data: {
            from: 'testera',
            to: 'testerb',
            amount: '13',
            memo: '中文'
          },
          authorization: [{
            account: 'testera',
            permission: 'active'
          }]
        }]
      }, { broadcast: false });
    });
  });

  if (process.env['CURRENCY_ABI'] != null) {
    it('Transaction ABI lookup', function _callee2() {
      var xmax, tx;
      return regeneratorRuntime.async(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              xmax = XMax.Localnet();
              _context2.next = 3;
              return regeneratorRuntime.awrap(xmax.transaction({
                scope: ['testera', 'testerb'],
                messages: [{
                  code: 'currency',
                  type: 'transfer',
                  data: {
                    from: 'testera',
                    to: 'testerb',
                    quantity: '13'
                  },
                  authorization: [{
                    account: 'testera',
                    permission: 'active'
                  }]
                }]
              }, { sign: false, broadcast: false }));

            case 3:
              tx = _context2.sent;

              console.log('tx', tx);
              assert.equal(tx.transaction.messages[0].code, 'currency');

            case 6:
            case 'end':
              return _context2.stop();
          }
        }
      }, null, this);
    });
  } else {
    console.log('To run the currency Abi test: deploy the "currency" smart contract, set the CURRENCY_ABI environment variable.');
  }
} // if development


var randomName = function randomName() {
  return 'a' + String(Math.round(Math.random() * 1000000000)).replace(/[0,6-9]/g, '');
};