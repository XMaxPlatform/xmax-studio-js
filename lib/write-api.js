'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var assert = require('assert');
var ecc = require('xmaxjs-ecc-lib');
var Fcbuffer = require('xmaxjs-fcbuffer-lib');
var createHash = require('create-hash');

var _require = require('xmaxjs-api-lib'),
    processArgs = _require.processArgs;

var Structs = require('./structs');

module.exports = writeApiGen;

var sign = ecc.sign;


function writeApiGen(Network, network, structs, config) {
  if (typeof config.chainId !== 'string') {
    throw new TypeError('config.chainId is required');
  }

  var writeApi = WriteApi(Network, network, config, structs.transaction);
  var reserveFunctions = new Set(['transaction', 'contract']);
  var merge = {};

  // sends transactions, also a message collecting wrapper functions 
  merge.transaction = writeApi.genTransaction(structs, merge);

  // Immediate send operations automatically calls merge.transaction
  for (var type in Network.schema) {
    if (!/^[a-z]/.test(type)) {
      // Only lower case structs will work in a transaction message
      // See xmaxjs-json-lib generated.json
      continue;
    }
    if (type === 'transaction') {
      continue;
    }
    if (reserveFunctions.has(type)) {
      throw new TypeError('Conflicting Api function: ' + type);
    }
    var struct = structs[type];
    if (struct == null || type === 'struct_t' || tmpRemoveSet.has(type)) {
      continue;
    }
    var definition = schemaFields(Network.schema, type);
    merge[type] = writeApi.genMethod(type, definition, merge.transaction);
  }

  /**
    Immedate send contract actions.
      @example xmax.contract('mycontract', [options], [callback])
    @example xmax.contract('mycontract').then(mycontract => mycontract.action(...))
  */
  merge.contract = function () {
    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    var _processArgs = processArgs(args, ['code'], 'contract', optionsFormatter),
        params = _processArgs.params,
        options = _processArgs.options,
        returnPromise = _processArgs.returnPromise,
        callback = _processArgs.callback;

    var code = params.code;

    // sends transactions via its own transaction function

    writeApi.genContractActions(code).then(function (r) {
      callback(null, r);
    }).catch(function (r) {
      callback(r);
    });

    return returnPromise;
  };

  return merge;
}

/** TODO: tag in the xmaxjs-json-lib */
var tmpRemoveSet = new Set('account_permission message account_permission_weight signed_transaction ' + 'key_permission_weight authority blockchain_configuration type_def action ' + 'table abi nonce'.split(' '));

function WriteApi(Network, network, config, Transaction) {
  /**
    @arg {array} [args.contracts]
    @arg {callback|object} args.transaction tr => {tr.transfer .. }
    @arg {object} [args.options]
    @arg {function} [args.callback]
  */
  var genTransaction = function genTransaction(structs, merge) {
    return function _callee() {
      for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        args[_key2] = arguments[_key2];
      }

      var contracts, options, callback, isContractArray, codes, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, message, codePromises, arg, contractPromises, _iteratorNormalCompletion2, _didIteratorError2, _iteratorError2, _iterator2, _step2, code;

      return regeneratorRuntime.async(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              contracts = void 0, options = void 0, callback = void 0;


              if (args[args.length - 1] == null) {
                // callback may be undefined
                args = args.slice(0, args.length - 1);
              }

              isContractArray = isStringArray(args[0]);

              if (!isContractArray) {
                _context.next = 8;
                break;
              }

              contracts = args[0];
              args = args.slice(1);
              _context.next = 38;
              break;

            case 8:
              if (!(typeof args[0] === 'string')) {
                _context.next = 13;
                break;
              }

              contracts = [args[0]];
              args = args.slice(1);
              _context.next = 38;
              break;

            case 13:
              if (!(_typeof(args[0]) === 'object' && _typeof(Array.isArray(args[0].messages)))) {
                _context.next = 38;
                break;
              }

              // full transaction, lookup ABIs used by each message
              codes = new Set(); // make a unique list

              _iteratorNormalCompletion = true;
              _didIteratorError = false;
              _iteratorError = undefined;
              _context.prev = 18;
              for (_iterator = args[0].messages[Symbol.iterator](); !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                message = _step.value;

                codes.add(message.code);
              }
              _context.next = 26;
              break;

            case 22:
              _context.prev = 22;
              _context.t0 = _context['catch'](18);
              _didIteratorError = true;
              _iteratorError = _context.t0;

            case 26:
              _context.prev = 26;
              _context.prev = 27;

              if (!_iteratorNormalCompletion && _iterator.return) {
                _iterator.return();
              }

            case 29:
              _context.prev = 29;

              if (!_didIteratorError) {
                _context.next = 32;
                break;
              }

              throw _iteratorError;

            case 32:
              return _context.finish(29);

            case 33:
              return _context.finish(26);

            case 34:
              codePromises = [];

              codes.forEach(function (code) {
                if (code !== 'xmax') {
                  // XMax contract operations are cached in xmaxjs-json-lib (allows for offline transactions)
                  codePromises.push(config.abiCache.abiAsync(code));
                }
              });
              _context.next = 38;
              return regeneratorRuntime.awrap(Promise.all(codePromises));

            case 38:

              if (args.length > 1 && typeof args[args.length - 1] === 'function') {
                callback = args.pop();
              }

              if (args.length > 1 && _typeof(args[args.length - 1]) === 'object') {
                options = args.pop();
              }

              assert.equal(args.length, 1, 'transaction args: [contracts], transaction<callback|object>, [options], [callback]');
              arg = args[0];

              if (!contracts) {
                _context.next = 66;
                break;
              }

              assert(!callback, 'callback with contracts are not supported');
              assert.equal('function', typeof arg === 'undefined' ? 'undefined' : _typeof(arg), 'provide function callback following contracts array parameter');

              contractPromises = [];
              _iteratorNormalCompletion2 = true;
              _didIteratorError2 = false;
              _iteratorError2 = undefined;
              _context.prev = 49;

              for (_iterator2 = contracts[Symbol.iterator](); !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                code = _step2.value;

                // setup wrapper functions to collect contract api calls
                contractPromises.push(genContractActions(code, merge.transaction));
              }

              _context.next = 57;
              break;

            case 53:
              _context.prev = 53;
              _context.t1 = _context['catch'](49);
              _didIteratorError2 = true;
              _iteratorError2 = _context.t1;

            case 57:
              _context.prev = 57;
              _context.prev = 58;

              if (!_iteratorNormalCompletion2 && _iterator2.return) {
                _iterator2.return();
              }

            case 60:
              _context.prev = 60;

              if (!_didIteratorError2) {
                _context.next = 63;
                break;
              }

              throw _iteratorError2;

            case 63:
              return _context.finish(60);

            case 64:
              return _context.finish(57);

            case 65:
              return _context.abrupt('return', Promise.all(contractPromises).then(function (actions) {
                var merges = {};
                actions.forEach(function (m, i) {
                  merges[contracts[i]] = m;
                });
                var param = isContractArray ? merges : merges[contracts[0]];
                // collect and invoke api calls
                return trMessageCollector(arg, options, param);
              }));

            case 66:
              if (!(typeof arg === 'function')) {
                _context.next = 68;
                break;
              }

              return _context.abrupt('return', trMessageCollector(arg, options, merge));

            case 68:
              if (!((typeof arg === 'undefined' ? 'undefined' : _typeof(arg)) === 'object')) {
                _context.next = 70;
                break;
              }

              return _context.abrupt('return', transaction(arg, options, callback));

            case 70:
              throw new Error('first transaction argument unrecognized', arg);

            case 71:
            case 'end':
              return _context.stop();
          }
        }
      }, null, this, [[18, 22, 26, 34], [27,, 29, 33], [49, 53, 57, 65], [58,, 60, 64]]);
    };
  };

  function genContractActions(code) {
    var transaction = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

    return config.abiCache.abiAsync(code).then(function (cache) {
      assert(Array.isArray(cache.abi.actions) && cache.abi.actions.length, 'No actions');

      var contractMerge = {};
      contractMerge.transaction = transaction ? transaction : genTransaction(cache.structs, contractMerge);

      cache.abi.actions.forEach(function (_ref) {
        var action_name = _ref.action_name,
            type = _ref.type;

        var definition = schemaFields(cache.schema, type);
        contractMerge[action_name] = genMethod(type, definition, contractMerge.transaction, code, action_name);
      });

      contractMerge.fc = cache;

      return contractMerge;
    });
  }

  function genMethod(type, definition, transactionArg) {
    var code = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'xmax';
    var action_name = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : type;

    return function () {
      for (var _len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
        args[_key3] = arguments[_key3];
      }

      if (args.length === 0) {
        console.error(usage(type, definition, Network, code, config));
        return;
      }

      // Special case like multi-message transactions where this lib needs
      // to be sure the broadcast is off.
      var optionOverrides = {};
      var lastArg = args[args.length - 1];
      if ((typeof lastArg === 'undefined' ? 'undefined' : _typeof(lastArg)) === 'object' && _typeof(lastArg.__optionOverrides) === 'object') {
        // pop() fixes the args.length
        Object.assign(optionOverrides, args.pop().__optionOverrides);
      }

      var processedArgs = processArgs(args, Object.keys(definition), type, optionsFormatter);

      var options = processedArgs.options;
      var params = processedArgs.params,
          returnPromise = processedArgs.returnPromise,
          callback = processedArgs.callback;


      var optionDefaults = { // From config and configDefaults
        broadcast: config.broadcast,
        sign: config.sign

        // internal options (ex: multi-message transaction)
      };options = Object.assign({}, optionDefaults, options, optionOverrides);
      if (optionOverrides.noCallback && !returnPromise) {
        throw new Error('Callback during a transaction are not supported');
      }

      var addDefaultScope = options.scope == null;
      var addDefaultAuths = options.authorization == null;

      if (typeof options.scope === 'string') {
        options.scope = [options.scope];
      }

      var authorization = [];
      if (options.authorization) {
        if (typeof options.authorization === 'string') {
          options.authorization = [options.authorization];
        }
        options.authorization.forEach(function (auth) {
          if (typeof auth === 'string') {
            var _auth$split = auth.split('@'),
                _auth$split2 = _slicedToArray(_auth$split, 2),
                account = _auth$split2[0],
                _auth$split2$ = _auth$split2[1],
                permission = _auth$split2$ === undefined ? 'active' : _auth$split2$;

            authorization.push({ account: account, permission: permission });
          } else if ((typeof auth === 'undefined' ? 'undefined' : _typeof(auth)) === 'object') {
            authorization.push(auth);
          }
        });
        assert.equal(authorization.length, options.authorization.length, 'invalid authorization in: ' + JSON.stringify(options.authorization));
      }

      var tr = {
        scope: options.scope || [],
        messages: [{
          code: code,
          type: action_name,
          data: params,
          authorization: authorization
        }]
      };

      if (addDefaultScope || addDefaultAuths) {
        var fieldKeys = Object.keys(definition);
        var f1 = fieldKeys[0];

        if (definition[f1] === 'account_name') {
          if (addDefaultScope) {
            // Make a simple guess based on ABI conventions.
            tr.scope.push(params[f1]);
          }
          if (addDefaultAuths) {
            // Default authorization (since user did not provide one)
            tr.messages[0].authorization.push({
              account: params[f1],
              permission: 'active'
            });
          }
        }

        if (addDefaultScope) {
          if (fieldKeys.length > 1 && !/addaccount/.test(type)) {
            var f2 = fieldKeys[1];
            if (definition[f2] === 'account_name') {
              tr.scope.push(params[f2]);
            }
          }
        }
      }

      tr.scope = tr.scope.sort();
      tr.messages[0].authorization.sort(function (a, b) {
        return a.account > b.account ? 1 : a.account < b.account ? -1 : 0;
      });

      // multi-message transaction support
      if (!optionOverrides.messageOnly) {
        transactionArg(tr, options, callback);
      } else {
        callback(null, tr);
      }

      return returnPromise;
    };
  }

  /**
    Transaction Message Collector
      Wrap merge.functions adding optionOverrides that will suspend
    transaction broadcast.
  */
  function trMessageCollector(trCallback) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    var merges = arguments[2];

    assert.equal('function', typeof trCallback === 'undefined' ? 'undefined' : _typeof(trCallback), 'trCallback');
    assert.equal('object', typeof options === 'undefined' ? 'undefined' : _typeof(options), 'options');
    assert.equal('object', typeof merges === 'undefined' ? 'undefined' : _typeof(merges), 'merges');
    assert(!Array.isArray(merges), 'merges should not be an array');
    assert.equal('function', typeof transaction === 'undefined' ? 'undefined' : _typeof(transaction), 'transaction');

    var scope = {};
    var messageList = [];
    var messageCollector = {};

    var wrap = function wrap(opFunction) {
      return function () {
        for (var _len4 = arguments.length, args = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
          args[_key4] = arguments[_key4];
        }

        // call the original function but force-disable a lot of stuff
        var ret = opFunction.apply(undefined, args.concat([{
          __optionOverrides: {
            broadcast: false,
            messageOnly: true,
            noCallback: true
          }
        }]));
        if (ret == null) {
          // double-check (code can change)
          throw new Error('Callbacks can not be used when creating a multi-message transaction');
        }
        messageList.push(ret);
      };
    };

    // merges can be an object of functions (as in the main xmax contract)
    // or an object of contract names with functions under those
    for (var key in merges) {
      var value = merges[key];
      if (typeof value === 'function') {
        // Native operations (xmax contract for example)
        messageCollector[key] = wrap(value);
      } else if ((typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object') {
        // other contract(s) (currency contract for example)
        if (messageCollector[key] == null) {
          messageCollector[key] = {};
        }
        for (var key2 in value) {
          if (key2 === 'transaction') {
            continue;
          }
          messageCollector[key][key2] = wrap(value[key2]);
        }
      }
    }

    var promiseCollector = void 0;
    try {
      // caller will load this up with messages
      promiseCollector = trCallback(messageCollector);
    } catch (error) {
      promiseCollector = Promise.reject(error);
    }

    return Promise.resolve(promiseCollector).then(function () {
      return Promise.all(messageList).then(function (resolvedMessageList) {
        var scopes = new Set();
        var messages = [];
        var _iteratorNormalCompletion3 = true;
        var _didIteratorError3 = false;
        var _iteratorError3 = undefined;

        try {
          for (var _iterator3 = resolvedMessageList[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
            var m = _step3.value;

            var _scope = m.scope,
                _m$messages = _slicedToArray(m.messages, 1),
                message = _m$messages[0];

            _scope.forEach(function (s) {
              scopes.add(s);
            });
            messages.push(message);
          }
        } catch (err) {
          _didIteratorError3 = true;
          _iteratorError3 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion3 && _iterator3.return) {
              _iterator3.return();
            }
          } finally {
            if (_didIteratorError3) {
              throw _iteratorError3;
            }
          }
        }

        var trObject = {};
        trObject.scope = Array.from(scopes).sort();
        trObject.messages = messages;
        return transaction(trObject, options);
      });
    });
  }

  function transaction(arg, options, callback) {
    var optionDefault = { expireInSeconds: 60, broadcast: true, sign: true };
    options = Object.assign({} /*clone*/, optionDefault, options);

    var returnPromise = void 0;
    if (typeof callback !== 'function') {
      returnPromise = new Promise(function (resolve, reject) {
        callback = function callback(err, result) {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        };
      });
    }

    if ((typeof arg === 'undefined' ? 'undefined' : _typeof(arg)) !== 'object') {
      throw new TypeError('First transaction argument should be an object or function');
    }

    if (!Array.isArray(arg.scope)) {
      throw new TypeError('Expecting scope array');
    }
    if (!Array.isArray(arg.messages)) {
      throw new TypeError('Expecting messages array');
    }

    if (config.transactionLog) {
      // wrap the callback with the logger
      var superCallback = callback;
      callback = function callback(error, tr) {
        if (error) {
          config.transactionLog(error);
        } else {
          config.transactionLog(null, tr);
        }
        superCallback(error, tr);
      };
    }

    arg.messages.forEach(function (message) {
      if (!Array.isArray(message.authorization)) {
        throw new TypeError('Expecting message.authorization array', message);
      }
    });

    if (options.sign && typeof config.signProvider !== 'function') {
      throw new TypeError('Expecting config.signProvider function (disable using {sign: false})');
    }

    var headers = config.transactionHeaders ? config.transactionHeaders : network.createTransaction;

    headers(options.expireInSeconds, checkError(callback, function (rawTx) {
      assert.equal(typeof rawTx === 'undefined' ? 'undefined' : _typeof(rawTx), 'object', 'expecting transaction header object');
      assert.equal(_typeof(rawTx.ref_block_num), 'number', 'expecting ref_block_num number');
      assert.equal(_typeof(rawTx.ref_block_prefix), 'number', 'expecting ref_block_prefix number');
      assert.equal(_typeof(rawTx.expiration), 'string', 'expecting expiration: iso date time string');

      rawTx = Object.assign({}, rawTx, {
        read_scope: [],
        signatures: []
      });

      rawTx.scope = arg.scope;
      rawTx.messages = arg.messages;

      // console.log('rawTx', JSON.stringify(rawTx,null,4))

      // resolve shorthand
      // const txObject = Transaction.toObject(Transaction.fromObject(rawTx))
      var txObject = Transaction.fromObject(rawTx);

      // console.log('txObject', JSON.stringify(txObject,null,4))

      // Broadcast what is signed (instead of rawTx)
      var buf = Fcbuffer.toBuffer(Transaction, txObject);
      var tr = Fcbuffer.fromBuffer(Transaction, buf);

      var transactionId = createHash('sha256').update(buf).digest().toString('hex');

      var sigs = [];
      if (options.sign) {
        var chainIdBuf = new Buffer(config.chainId, 'hex');
        var signBuf = Buffer.concat([chainIdBuf, buf]);
        sigs = config.signProvider({ transaction: tr, buf: signBuf, sign: sign });
        if (!Array.isArray(sigs)) {
          sigs = [sigs];
        }
      }

      // sigs can be strings or Promises
      Promise.all(sigs).then(function (sigs) {
        sigs = [].concat.apply([], sigs); //flatten arrays in array
        tr.signatures = sigs;

        var mock = config.mockTransactions ? config.mockTransactions() : null;
        if (mock != null) {
          assert(/pass|fail/.test(mock), 'mockTransactions should return a string: pass or fail');
          if (mock === 'pass') {
            callback(null, {
              transaction_id: transactionId,
              mockTransaction: true,
              broadcast: false,
              transaction: tr
            });
          }
          if (mock === 'fail') {
            console.error('[push_transaction mock error] \'fake error\', digest \'' + buf.toString('hex') + '\'');
            callback('fake error');
          }
          return;
        }

        if (!options.broadcast) {
          callback(null, {
            transaction_id: transactionId,
            broadcast: false,
            transaction: tr
          });
        } else {
          network.pushTransaction(tr, function (error, result) {
            if (!error) {
              callback(null, {
                transaction_id: transactionId,
                broadcast: true,
                transaction: tr,
                events: result.events
              });
            } else {
              console.error('[push_transaction error] \'' + error.message + '\', digest \'' + buf.toString('hex') + '\'');
              callback(error.message);
            }
          });
        }
      }).catch(function (error) {
        console.error(error);
        callback(error);
      });
    }));
    return returnPromise;
  }

  // return WriteApi
  return {
    genTransaction: genTransaction,
    genContractActions: genContractActions,
    genMethod: genMethod
  };
}

var isStringArray = function isStringArray(o) {
  return Array.isArray(o) && o.length > 0 && o.findIndex(function (o) {
    return typeof o !== 'string';
  }) === -1;
};

// Normalize the extra optional options argument
var optionsFormatter = function optionsFormatter(option) {
  if ((typeof option === 'undefined' ? 'undefined' : _typeof(option)) === 'object') {
    return option; // {debug, broadcast, scope, etc} (scope, etc my overwrite tr below)
  }
  if (typeof option === 'boolean') {
    // broadcast argument as a true false value, back-end cli will use this shorthand
    return { broadcast: option };
  }
};

function usage(type, definition, Network, code, config) {
  var usage = '';
  var out = function out() {
    var str = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';

    usage += str + '\n';
  };
  out('CONTRACT');
  out('' + code);
  out();

  out('FUNCTION');
  out(type);
  out();

  var struct = void 0;
  if (code === 'xmax') {
    var _Structs = Structs({ defaults: true, network: Network }),
        structs = _Structs.structs;

    struct = structs[type];

    out('PARAMETERS');
    out('' + JSON.stringify(definition, null, 4));
    out();

    out('EXAMPLE');
    out('' + JSON.stringify(struct.toObject(), null, 4));
  } else {
    var cache = config.abiCache.abi(code);
    out('PARAMETERS');
    out(JSON.stringify(schemaFields(cache.schema, type), null, 4));
    out();

    struct = cache.structs[type];
    out('EXAMPLE');
    out('' + JSON.stringify(struct.toObject(), null, 4));
  }
  if (struct == null) {
    throw TypeError('Unknown type: ' + type);
  }
  return usage;
}

var checkError = function checkError(parentErr, parrentRes) {
  return function (error, result) {
    if (error) {
      console.log('error', error);
      parentErr(error);
    } else {
      parrentRes(result);
    }
  };
};

function schemaFields(schema, type) {
  var _schema$type = schema[type],
      base = _schema$type.base,
      fields = _schema$type.fields;

  var def = {};
  if (base && base !== '') {
    Object.assign(def, schemaFields(schema, base));
  }
  Object.assign(def, fields);
  return def;
}