/**
 * Topo Model
 *
 * @class TopoModel
 * @module Hightail
 * @submodule Hightail.Services
 *
 * @author justin.fiedler
 * @since 0.0.0
 *
 * @copyright (c) 2014 Hightail Inc. All Rights Reserved
 */
'use strict';

angular.wilson.service('TopoModel', function() {
  var TOPO_VAR_REGEX = /\$\{(\w+)\}/g;

  var ENV_GROUP_LOCATORS = {
    'global': 'global',
    'default': 'default',
    'ITX': /^it.?/i,
    'SQX': /^sq.?/i,
    'ODP': /^odp.?/i,
    'SJCPRD': /^sjcprd((?!wrk).)*$/i,
    'SJCPRDWRK': /^sjcprdwrk/i,
    'misc': ''
  };

  /**
   * Returns and array of the TOPO vars in the topoValue
   *
   * e.g. "www.${ENV_PREFIX}.${EXTERNAL_DOMAIN}" => [ENV_PREFIX, EXTERNAL_DOMAIN]
   *
   * @param topoValue
   */
  function getTopoVariables(topoValue) {
    var matches = topoValue.match(TOPO_VAR_REGEX);

    matches = _.map(matches, function(match) {
      return match.replace(/[\$\{\}]/g, '');
    });

    return matches;
  }

  function TopoModel(topos) {
    this.topos = topos;
  }

  /**
   * Returns the TOPO value for @env and @key
   *
   * @param env
   * @param key
   * @param showDefault   If true values will fallback to 'default' env if there is no value for @key in @env
   * @returns {*}
   */
  TopoModel.prototype.getValue = function(env, key, showDefault) {
    var value = this.topos[env][key];

    if (showDefault && _.isUndefined(value)) {
      value = this.topos['default'][key];
    }

    return value;
  };

  /**
   * Returns the exapanded TOPO value for @env and @key
   *
   * @param env
   * @param key
   * @param showDefault   If true values will fallback to 'default' env if there is no value for @key in @env
   * @returns {*}
   */
  TopoModel.prototype.getExpandedValue = _.memoize(function(env, key, showDefault) {
    var _self = this;
    var value = this.getValue(env, key, showDefault);

    if (!_.isUndefined(value)) {
      var topoVars = getTopoVariables(value);
      var varDictionary = {};
      _.each(topoVars, function(topoVar) {
        var topoValue = _self.getExpandedValue(env, topoVar, true);
        if(_.isUndefined(topoValue)) {
          topoValue = topoVar;
        }
        varDictionary[topoVar] = topoValue;
      });

      value = _.template(value, varDictionary, {
        evaluate: /\$\{(.+?)\}/g
      });
    }

    return value;
  }, function(env, key, showDefault) {
    return [env, key, showDefault].join(':');
  });

  TopoModel.prototype.isDefaultValue = function(env, key) {
    if(env === 'default' || this.topos[env][key]) {
      return false;
    }

    return true;
  };

  TopoModel.prototype.getAllEnvironments = function() {
    return _.keys(this.topos);
  };


  TopoModel.prototype.getAllKeys = function() {
    var topoKeys = [];
    var envs = this.getAllEnvironments();
    var topos = this.topos;

    _.each(envs, function(env) {
      topoKeys = _.union(topoKeys, _.keys(topos[env]));
    });

    return topoKeys;
  };

  TopoModel.prototype.getGroupNames = function() {
    return _.keys(ENV_GROUP_LOCATORS);
  }

  TopoModel.prototype.getGroupDicitonary = function() {
    var grouppedEnvs = [];
    var groups = {};
    var envs = this.getAllEnvironments();

    _.each(ENV_GROUP_LOCATORS, function (locator, key) {
      groups[key] = _.filter(envs, function (env) {
        var match = false;
        if (_.isString(locator)) {
          match = (locator === env);
        } else {
          //console.log(typeof locator);
          //regex
          match = locator.test(env);
        }

        if (match) {
          grouppedEnvs.push(env);
        }

        return match;
      });
    });

    grouppedEnvs = _.uniq(grouppedEnvs);

    groups['misc'] = _.difference(envs, grouppedEnvs);

    return groups;
  };



  return TopoModel;
});