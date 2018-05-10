'use strict';

var Structs = require('./structs');

module.exports = AbiCache;

function AbiCache(network, config) {
  // Help (or "usage") needs {defaults: true}
  config = Object.assign({}, { defaults: true }, config);
  var cache = {};

  /**
    @arg {boolean} force false when ABI is immutable.  When force is true, API
    user is still free to cache the contract object returned by xmaxjs 
  */
  function abiAsync(code) {
    var force = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;

    if (force == false && cache[code] != null) {
      return Promise.resolve(cache[code]);
    }
    return network.getCode(code).then(function (_ref) {
      var abi = _ref.abi;

      var schema = abiToFcSchema(abi);
      var structs = Structs(config, schema); // structs = {structs, types}
      return cache[code] = Object.assign({ abi: abi, schema: schema }, structs);
    });
  }

  function abi(code) {
    var c = cache[code];
    if (c == null) {
      throw new Error('Abi \'' + code + '\' is not cached, call abiAsync(\'' + code + '\')');
    }
    return c;
  }

  return {
    abiAsync: abiAsync,
    abi: abi
  };
}

function abiToFcSchema(abi) {
  // customTypes
  // For FcBuffer
  var abiSchema = {};

  // convert abi types to Fcbuffer schema
  if (abi.types) {
    // aliases
    abi.types.forEach(function (e) {
      abiSchema[e.new_type_name] = e.type;
    });
  }

  if (abi.structs) {
    abi.structs.forEach(function (e) {
      var base = e.base,
          fields = e.fields;

      abiSchema[e.name] = { base: base, fields: fields };
      if (base === '') {
        delete abiSchema[e.name].base;
      }
    });
  }

  return abiSchema;
}