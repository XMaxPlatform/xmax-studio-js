'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _require = require('xmaxjs-ecc-lib'),
    PublicKey = _require.PublicKey;

var json = require('xmaxjs-json-lib');
var Fcbuffer = require('xmaxjs-fcbuffer-lib');
var ByteBuffer = require('bytebuffer');
var assert = require('assert');

var _require2 = require('./format'),
    isName = _require2.isName,
    encodeName = _require2.encodeName,
    decodeName = _require2.decodeName,
    UDecimalPad = _require2.UDecimalPad,
    UDecimalImply = _require2.UDecimalImply,
    UDecimalUnimply = _require2.UDecimalUnimply;

/** Configures Fcbuffer for XMAX specific structs and types. */


module.exports = function () {
  var config = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var extendedSchema = arguments[1];

  var structLookup = function structLookup(name, code) {
    if (code === 'xmax') {
      return structs[name];
    }
    var abi = config.abiCache.abi(code);
    var struct = abi.structs[name];
    if (struct != null) {
      return struct;
    }
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = abi.abi.actions[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var action = _step.value;
        var action_name = action.action_name,
            type = action.type;

        if (action_name === name) {
          var _struct = abi.structs[type];
          if (_struct != null) {
            return _struct;
          }
        }
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator.return) {
          _iterator.return();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }

    throw new Error('Missing ABI struct or action: ' + name);
  };

  // If xmaxrun does not have an ABI setup for a certain message.type, it will throw
  // an error: `Invalid cast from object_type to string` .. forceMessageDataHex
  // may be used to until native ABI is added or fixed.
  var forceMessageDataHex = config.forceMessageDataHex != null ? config.forceMessageDataHex : false;

  var override = Object.assign({}, authorityOverride, abiOverride, wasmCodeOverride(config), messageDataOverride(structLookup, forceMessageDataHex), config.override);

  var xmaxTypes = {
    name: function name() {
      return [Name];
    },
    public_key: function public_key() {
      return [PublicKeyType];
    },
    asset_symbol: function asset_symbol() {
      return [AssetSymbol];
    },
    asset: function asset() {
      return [Asset];
    } // must come after AssetSymbol
  };

  var customTypes = Object.assign({}, xmaxTypes, config.customTypes);
  config = Object.assign({ override: override }, { customTypes: customTypes }, config);

  // Do not sort transaction messages
  config.nosort = Object.assign({}, config.nosort);
  config.nosort['transaction.message'] = true;

  var schema = Object.assign({}, json.schema, extendedSchema);

  var _Fcbuffer = Fcbuffer(schema, config),
      structs = _Fcbuffer.structs,
      types = _Fcbuffer.types,
      errors = _Fcbuffer.errors;

  if (errors.length !== 0) {
    throw new Error(JSON.stringify(errors, null, 4) + '\nin\n' + JSON.stringify(schema, null, 4));
  }

  return { structs: structs, types: types };
};

/**
  Name xmax::types native.hpp
*/
var Name = function Name(validation) {
  return {
    fromByteBuffer: function fromByteBuffer(b) {
      var n = decodeName(b.readUint64(), false); // b is already in littleEndian
      // if(validation.debug) {
      //   console.error(`${n}`, '(Name.fromByteBuffer)')
      // }
      return n;
    },
    appendByteBuffer: function appendByteBuffer(b, value) {
      // if(validation.debug) {
      //   console.error(`${value}`, (Name.appendByteBuffer))
      // }
      b.writeUint64(encodeName(value, false)); // b is already in littleEndian
    },
    fromObject: function fromObject(value) {
      return value;
    },
    toObject: function toObject(value) {
      if (validation.defaults && value == null) {
        return '';
      }
      return value;
    }
  };
};

var PublicKeyType = function PublicKeyType(validation) {
  return {
    fromByteBuffer: function fromByteBuffer(b) {
      var bcopy = b.copy(b.offset, b.offset + 33);
      b.skip(33);
      var pubbuf = Buffer.from(bcopy.toBinary(), 'binary');
      return PublicKey.fromBuffer(pubbuf).toString();
    },
    appendByteBuffer: function appendByteBuffer(b, value) {
      // if(validation.debug) {
      //   console.error(`${value}`, 'PublicKeyType.appendByteBuffer')
      // }
      var buf = PublicKey.fromStringOrThrow(value).toBuffer();
      b.append(buf.toString('binary'), 'binary');
    },
    fromObject: function fromObject(value) {
      return value;
    },
    toObject: function toObject(value) {
      if (validation.defaults && value == null) {
        return 'XMX6MRy..';
      }
      return value;
    }
  };
};

var AssetSymbol = function AssetSymbol(validation) {
  function valid(value) {
    if (typeof value !== 'string') {
      throw new TypeError('Asset symbol should be a string');
    }
    if (value.length > 7) {
      throw new TypeError('Asset symbol is 7 characters or less');
    }
  }

  var prefix = '\x04';

  return {
    fromByteBuffer: function fromByteBuffer(b) {
      var bcopy = b.copy(b.offset, b.offset + 7);
      b.skip(7);

      // const precision = bcopy.readUint8()
      // console.log('precision', precision)

      var bin = bcopy.toBinary();
      if (bin.slice(0, 1) !== prefix) {
        throw new TypeError('Asset precision does not match');
      }
      var symbol = '';
      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = bin.slice(1)[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var code = _step2.value;

          if (code == '\0') {
            break;
          }
          symbol += code;
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2.return) {
            _iterator2.return();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }

      return symbol;
    },
    appendByteBuffer: function appendByteBuffer(b, value) {
      valid(value);
      value += '\0'.repeat(7 - value.length);
      b.append(prefix + value);
    },
    fromObject: function fromObject(value) {
      valid(value);
      return value;
    },
    toObject: function toObject(value) {
      if (validation.defaults && value == null) {
        return 'SYMBOL';
      }
      valid(value);
      return value;
    }
  };
};

var Asset = function Asset(validation, baseTypes, customTypes) {
  var amountType = baseTypes.int64(validation);
  var symbolType = customTypes.asset_symbol(validation);

  var symbolCache = function symbolCache(symbol) {
    return { precision: 4 };
  };
  var precision = function precision(symbol) {
    return symbolCache(symbol).precision;
  };

  function toAssetString(value) {
    if (typeof value === 'string') {
      var _value$split = value.split(' '),
          _value$split2 = _slicedToArray(_value$split, 2),
          amount = _value$split2[0],
          symbol = _value$split2[1];

      return UDecimalPad(amount, precision(symbol)) + ' ' + symbol;
    }
    if ((typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object') {
      var _amount = value.amount,
          _symbol = value.symbol;

      return UDecimalUnimply(_amount, precision(_symbol)) + ' ' + _symbol;
    }
    return value;
  }

  return {
    fromByteBuffer: function fromByteBuffer(b) {
      var amount = amountType.fromByteBuffer(b);
      var symbol = symbolType.fromByteBuffer(b);
      return UDecimalUnimply(amount, precision(symbol)) + ' ' + symbol;
    },
    appendByteBuffer: function appendByteBuffer(b, value) {
      var _value$split3 = value.split(' '),
          _value$split4 = _slicedToArray(_value$split3, 2),
          amount = _value$split4[0],
          symbol = _value$split4[1];

      amountType.appendByteBuffer(b, UDecimalImply(amount, precision(symbol)));
      symbolType.appendByteBuffer(b, symbol);
    },
    fromObject: function fromObject(value) {
      return toAssetString(value);
    },
    toObject: function toObject(value) {
      if (validation.defaults && value == null) {
        return '0.0001 SYMBOL';
      }
      return toAssetString(value);
    }
  };
};

var authorityOverride = {
  /** shorthand `XMX6MRyAj..` */
  'authority.fromObject': function authorityFromObject(value) {
    if (PublicKey.fromString(value)) {
      return {
        threshold: 1,
        keys: [{ key: value, weight: 1 }],
        accounts: []
      };
    }
    if (typeof value === 'string') {
      var _value$split5 = value.split('@'),
          _value$split6 = _slicedToArray(_value$split5, 2),
          account = _value$split6[0],
          _value$split6$ = _value$split6[1],
          permission = _value$split6$ === undefined ? 'active' : _value$split6$;

      return {
        threshold: 1,
        keys: [],
        accounts: [{
          permission: {
            account: account,
            permission: permission
          },
          weight: 1
        }]
      };
    }
  }
};

var abiOverride = {
  'abi.fromObject': function abiFromObject(value) {
    if (typeof value === 'string') {
      return JSON.parse(value);
    }
    if (Buffer.isBuffer(value)) {
      return JSON.parse(value.toString());
    }
  }
};

var wasmCodeOverride = function wasmCodeOverride(config) {
  return {
    'setcode.code.fromObject': function setcodeCodeFromObject(_ref) {
      var object = _ref.object,
          result = _ref.result;
      var binaryen = config.binaryen;

      assert(binaryen != null, 'required: config.binaryen = require("binaryen")');
      try {
        var code = object.code.toString();
        if (/^\s*\(module/.test(code)) {
          console.log('Assembling WASM...');
          var wasm = Buffer.from(binaryen.parseText(code).emitBinary());
          result.code = wasm;
        } else {
          result.code = object.code;
        }
      } catch (error) {
        console.error(error, object.code);
        throw error;
      }
    }
  };
};

/**
Nested serialized structure.  Nested struct may be in HEX or object format.
*/
var messageDataOverride = function messageDataOverride(structLookup, forceMessageDataHex) {
  return {
    'message.data.fromByteBuffer': function messageDataFromByteBuffer(_ref2) {
      var fields = _ref2.fields,
          object = _ref2.object,
          b = _ref2.b,
          config = _ref2.config;

      var ser = (object.type || '') == '' ? fields.data : structLookup(object.type, object.code);
      if (ser) {
        b.readVarint32(); // length prefix (usefull if object.type is unknown)
        object.data = ser.fromByteBuffer(b, config);
      } else {
        // console.log(`Unknown Message.type ${object.type}`)
        var lenPrefix = b.readVarint32();
        var bCopy = b.copy(b.offset, b.offset + lenPrefix);
        b.skip(lenPrefix);
        object.data = Buffer.from(bCopy.toBinary(), 'binary');
      }
    },

    'message.data.appendByteBuffer': function messageDataAppendByteBuffer(_ref3) {
      var fields = _ref3.fields,
          object = _ref3.object,
          b = _ref3.b;

      var ser = (object.type || '') == '' ? fields.data : structLookup(object.type, object.code);
      if (ser) {
        var b2 = new ByteBuffer(ByteBuffer.DEFAULT_CAPACITY, ByteBuffer.LITTLE_ENDIAN);
        ser.appendByteBuffer(b2, object.data);
        b.writeVarint32(b2.offset);
        b.append(b2.copy(0, b2.offset), 'binary');
      } else {
        // console.log(`Unknown Message.type ${object.type}`)
        var data = typeof object.data === 'string' ? new Buffer(object.data, 'hex') : object.data;
        if (!Buffer.isBuffer(data)) {
          throw new TypeError('Expecting hex string or buffer in message.data');
        }
        b.writeVarint32(data.length);
        b.append(data.toString('binary'), 'binary');
      }
    },

    'message.data.fromObject': function messageDataFromObject(_ref4) {
      var fields = _ref4.fields,
          object = _ref4.object,
          result = _ref4.result;
      var data = object.data,
          type = object.type;

      var ser = (type || '') == '' ? fields.data : structLookup(type, object.code);
      if (ser) {
        if ((typeof data === 'undefined' ? 'undefined' : _typeof(data)) === 'object') {
          result.data = ser.fromObject(data); // resolve shorthand
          return;
        } else if (typeof data === 'string') {
          var buf = new Buffer(data, 'hex');
          result.data = Fcbuffer.fromBuffer(ser, buf);
        } else {
          throw new TypeError('Expecting hex string or object in message.data');
        }
      } else {
        // console.log(`Unknown Message.type ${object.type}`)
        result.data = data;
      }
    },

    'message.data.toObject': function messageDataToObject(_ref5) {
      var fields = _ref5.fields,
          object = _ref5.object,
          result = _ref5.result,
          config = _ref5.config;

      var _ref6 = object || {},
          data = _ref6.data,
          type = _ref6.type;

      var ser = (type || '') == '' ? fields.data : structLookup(type, object.code);
      if (!ser) {
        // Types without an ABI will accept hex
        // const b2 = new ByteBuffer(ByteBuffer.DEFAULT_CAPACITY, ByteBuffer.LITTLE_ENDIAN)
        // const buf = !Buffer.isBuffer(data) ? new Buffer(data, 'hex') : data
        // b2.writeVarint32(buf.length)
        // b2.append(buf)
        // result.data = b2.copy(0, b2.offset).toString('hex')
        result.data = Buffer.isBuffer(data) ? data.toString('hex') : data;
        return;
      }

      if (forceMessageDataHex) {
        var b2 = new ByteBuffer(ByteBuffer.DEFAULT_CAPACITY, ByteBuffer.LITTLE_ENDIAN);
        if (data) {
          ser.appendByteBuffer(b2, data);
        }
        result.data = b2.copy(0, b2.offset).toString('hex');

        // console.log('result.data', result.data)
        return;
      }

      // Serializable JSON
      result.data = ser.toObject(data, config);
    }
  };
};