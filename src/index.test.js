/* eslint-env mocha */
const assert = require('assert')

const XMax = require('.')
const {ecc} = XMax.modules
const {Keystore} = require('xmaxjs-keygen')

describe('version', () => {
  it('exposes a version number', () => {
    assert.ok(XMax.version)
  })
})

describe('offline', () => {
  const headers = {
    ref_block_num: 1,
    ref_block_prefix: 452435776,
    expiration: new Date().toISOString().split('.')[0]
  }

  it('transaction', async function() {
    const privateKey = await ecc.unsafeRandomKey()

    const xmax = XMax.Localnet({
      keyProvider: privateKey,
      httpEndpoint: 'https://thissiteisnotexist.com.cn',
      transactionHeaders: (expireInSeconds, callback) => {
        callback(null/*error*/, headers)
      },
      broadcast: false,
      sign: true
    })

    const memo = ''
    const trx = await xmax.transfer('bankers', 'people', 1000000000000, memo)

    assert.deepEqual({
      ref_block_num: trx.transaction.ref_block_num,
      ref_block_prefix: trx.transaction.ref_block_prefix,
      expiration: trx.transaction.expiration
    }, headers)

    assert.equal(trx.transaction.signatures.length, 1, 'expecting 1 signature')
  })
})

// even transactions that don't broadcast require Api lookups
//  no testnet yet, avoid breaking travis-ci
if(process.env['NODE_ENV'] === 'development') {

  describe('networks', () => {
    it('testnet', (done) => {
      const xmax = XMax.Localnet()
      xmax.getBlock(1, (err, block) => {
        if(err) {
          throw err
        }
        done()
      })
    })
  })

  describe('transactions', () => {
    const wif = '5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3'
    const signProvider = ({sign, buf}) => sign(buf, wif)
    const promiseSigner = (args) => Promise.resolve(signProvider(args))

    it('usage', () => {
      const xmax = XMax.Localnet({signProvider})
      xmax.transfer()
    })

    // A keyProvider can return private keys directly..
    it('keyProvider private key', () => {

      // keyProvider should return an array of keys
      const keyProvider = () => {
        return [wif]
      }

      const xmax = XMax.Localnet({keyProvider})

      return xmax.transfer('testera', 'testerb', 1, '', false).then(tr => {
        assert.equal(tr.transaction.signatures.length, 1)
        assert.equal(typeof tr.transaction.signatures[0], 'string')
      })
    })

    // If a keystore is used, the keyProvider should return available
    // public keys first then respond with private keys next.
    it('keyProvider public keys then private key', () => {
      const pubkey = ecc.privateToPublic(wif)

      // keyProvider should return a string or array of keys.
      const keyProvider = ({transaction, pubkeys}) => {
        if(!pubkeys) {
          assert.equal(transaction.messages[0].type, 'transfer')
          return [pubkey]
        }

        if(pubkeys) {
          assert.deepEqual(pubkeys, [pubkey])
          return [wif]
        }
        assert(false, 'unexpected keyProvider callback')
      }

      const xmax = XMax.Localnet({keyProvider})

      return xmax.transfer('testera', 'testerb', 9, '', false).then(tr => {
        assert.equal(tr.transaction.signatures.length, 1)
        assert.equal(typeof tr.transaction.signatures[0], 'string')
      })
    })

    it('keyProvider from xmaxjs-keygen', () => {
      const keystore = Keystore('uid')
      keystore.deriveKeys({parent: wif})
      const xmax = XMax.Localnet({keyProvider: keystore.keyProvider})
      return xmax.transfer('testera', 'testerb', 12, '', true)
    })

    it('signProvider', () => {
      const customSignProvider = ({buf, sign, transaction}) => {

        // All potential keys (XMX6MRy.. is the pubkey for 'wif')
        const pubkeys = ['XMX6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV']

        return xmax.getRequiredKeys(transaction, pubkeys).then(res => {
          // Just the required_keys need to sign 
          assert.deepEqual(res.required_keys, pubkeys)
          return sign(buf, wif) // return hex string signature or array of signatures
        })
      }
      const xmax = XMax.Localnet({signProvider: customSignProvider})
      return xmax.transfer('testera', 'testerb', 2, '', false)
    })

    it('addaccount (broadcast)', () => {
      const xmax = XMax.Localnet({signProvider})
      const pubkey = 'XMX6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV'
      // const auth = {threshold: 1, keys: [{key: pubkey, weight: 1}], accounts: []}
      const name = randomName()

      return xmax.addaccount({
        creator: 'testera',
        name,
        owner: pubkey,
        active: pubkey,
        recovery: 'testera',
        deposit: '1.0000 XMX'
      })
    })

    it('mockTransactions pass', () => {
      const xmax = XMax.Localnet({signProvider, mockTransactions: 'pass'})
      return xmax.transfer('testera', 'testerb', 1, '').then(transfer => {
        assert(transfer.mockTransaction, 'transfer.mockTransaction')
      })
    })

    it('mockTransactions fail', () => {
      const xmax = XMax.Localnet({signProvider, mockTransactions: 'fail'})
      return xmax.transfer('testera', 'testerb', 1, '').catch(error => {
        assert(error.indexOf('fake error') !== -1, 'expecting: fake error')
      })
    })

    it('transfer (broadcast)', () => {
      const xmax = XMax.Localnet({signProvider})
      return xmax.transfer('testera', 'testerb', 1, '')
    })

    it('transfer custom authorization (broadcast)', () => {
      const xmax = XMax.Localnet({signProvider})
      return xmax.transfer('testera', 'testerb', 1, '', {authorization: 'testera@owner'})
    })

    it('transfer custom authorization sorting (no broadcast)', () => {
      const xmax = XMax.Localnet({signProvider})
      return xmax.transfer('testera', 'testerb', 1, '',
        {authorization: ['testerb@owner', 'testera@owner'], broadcast: false}
      ).then(({transaction}) => {
        const ans = [
          {account: 'testera', permission: 'owner'},
          {account: 'testerb', permission: 'owner'}
        ]
        assert.deepEqual(transaction.messages[0].authorization, ans)
      })
    })

    it('transfer custom scope (broadcast)', () => {
      const xmax = XMax.Localnet({signProvider})
      // To pass: testerb, testera must get sorted to: testera, testerb
      return xmax.transfer('testera', 'testerb', 2, '', {scope: ['testerb', 'testera']})
    })

    it('transfer custom scope array (no broadcast)', () => {
      const xmax = XMax.Localnet({signProvider})
      // To pass: scopes must get sorted
      return xmax.transfer('testera', 'testerb', 1, '',
        {scope: ['joe', 'billy'], broadcast: false}).then(({transaction}) => {
          assert.deepEqual(transaction.scope, ['billy', 'joe'])
        })
    })

    it('transfer (no broadcast)', () => {
      const xmax = XMax.Localnet({signProvider})
      return xmax.transfer('testera', 'testerb', 1, '', {broadcast: false})
    })

    it('transfer (no broadcast, no sign)', () => {
      const xmax = XMax.Localnet({signProvider})
      const opts = {broadcast: false, sign: false}
      return xmax.transfer('testera', 'testerb', 1, '', opts).then(tr => 
        assert.deepEqual(tr.transaction.signatures, [])
      )
    })

    it('transfer sign promise (no broadcast)', () => {
      const xmax = XMax.Localnet({signProvider: promiseSigner})
      return xmax.transfer('testera', 'testerb', 1, '', false)
    })

    it('message to unknown contract', () => {
      const name = 'acdef513521'
      return XMax.Localnet({signProvider}).contract(name)
      .then(() => {throw 'expecting error'})
      .catch(error => {
        assert(/unknown key/.test(error.toString()),
          'expecting "unknown key" error message, instead got: ' + error)
      })
    })

    it('message to contract', () => {
      // testeraPrivate = '5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3'
      // xmax is a bad test case, but it was the only native contract
      const name = 'xmax'
      return XMax.Localnet({signProvider}).contract(name).then(contract => {
        contract.transfer('testera', 'testerd', 1, '')
          // transaction sent on each command
          .then(tr => {assert.equal(1, tr.transaction.messages.length)})

        contract.transfer('testerd', 'testera', 1, '')
          .then(tr => {assert.equal(1, tr.transaction.messages.length)})

      }).then(r => {assert(r == undefined)})
    })

    it('message to contract atomic', () => {
      let amt = 1 // for unique transactions
      const testnet = XMax.Localnet({signProvider})

      const trTest = xmax => {
        assert(xmax.transfer('testera', 'testerf', amt, '') == null)
        assert(xmax.transfer('testerf', 'testera', amt++, '') == null)
      }

      const assertTr = test =>
        test.then(tr => {assert.equal(2, tr.transaction.messages.length)})
        
      //  contracts can be a string or array
      assertTr(testnet.transaction(['xmax'], ({xmax}) => trTest(xmax)))
      assertTr(testnet.transaction('xmax', xmax => trTest(xmax)))
    })

    it('message to contract (contract tr nesting)', () => {
      const tn = XMax.Localnet({signProvider})
      return tn.contract('xmax').then(xmax => {
        xmax.transaction(tr => {
          tr.transfer('testera', 'testerd', 1, '')
          tr.transfer('testera', 'testere', 1, '')
        })
        xmax.transfer('testera', 'testerf', 1, '')
      })
    })

    it('multi-message transaction (broadcast)', () => {
      const xmax = XMax.Localnet({signProvider})
      return xmax.transaction(tr => {
        assert(tr.transfer('testera', 'testerb', 1, '') == null)
        assert(tr.transfer({from: 'testera', to: 'testerc', amount: 1, memo: ''}) == null)
      })
      .then(tr => {
        assert.equal(2, tr.transaction.messages.length)
      })
    })

    it('multi-message transaction no inner callback', () => {
      const xmax = XMax.Localnet({signProvider})
      xmax.transaction(tr => {
        tr.okproducer('testera', 'testera', 1, cb => {})
      })
      .then(() => {throw 'expecting rollback'})
      .catch(error => {
        assert(/Callback during a transaction/.test(error), error)
      })
    })

    it('multi-message transaction error rollback', () => {
      const xmax = XMax.Localnet({signProvider})
      return xmax.transaction(tr => {throw 'rollback'})
      .then(() => {throw 'expecting rollback'})
      .catch(error => {
        assert(/rollback/.test(error), error)
      })
    })

    it('multi-message transaction Promise.reject rollback', () => {
      const xmax = XMax.Localnet({signProvider})
      xmax.transaction(tr => Promise.reject('rollback'))
      .then(() => {throw 'expecting rollback'})
      .catch(error => {
        assert(/rollback/.test(error), error)
      })
    })

    it('custom transfer', () => {
      const xmax = XMax.Localnet({signProvider})
      return xmax.transaction(
        {
          scope: ['testera', 'testerb'],
          messages: [
            {
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
            }
          ]
        },
        {broadcast: false}
      )
    })
  })

  if(process.env['CURRENCY_ABI'] != null) {
    it('Transaction ABI lookup', async function() {
      const xmax = XMax.Localnet()
      const tx = await xmax.transaction(
        {
          scope: ['testera', 'testerb'],
          messages: [
            {
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
            }
          ]
        },
        {sign: false, broadcast: false}
      )
      console.log('tx', tx)
      assert.equal(tx.transaction.messages[0].code, 'currency')
    })
  } else {
    console.log('To run the currency Abi test: deploy the "currency" smart contract, set the CURRENCY_ABI environment variable.');
  }

} // if development



const randomName = () => 'a' +
  String(Math.round(Math.random() * 1000000000)).replace(/[0,6-9]/g, '')

