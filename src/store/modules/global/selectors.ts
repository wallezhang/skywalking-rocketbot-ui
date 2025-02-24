/**
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Commit, ActionTree, MutationTree, Dispatch } from 'vuex';
import * as types from '../dashboard/mutation-types';
import { AxiosResponse } from 'axios';
import graph from '@/graph';
import { Duration, DurationTime, Option } from '@/types/global';
import { PageTypes, TopologyType } from '@/constants/constant';

const EntityType = ['Service', 'ServiceInstance', 'Endpoint'];
export interface State {
  services: Option[];
  currentService: Option;
  databases: Option[];
  currentDatabase: Option;
  endpoints: Option[];
  currentEndpoint: Option;
  instances: Option[];
  currentInstance: Option;
  updateDashboard: { key: string; label?: string | undefined };
  pageType: string;
  destService: Option;
  destInstance: Option;
  destEndpoint: Option;
  selectorErrors: { [key: string]: string };
}

const initState: State = {
  services: [],
  currentService: { key: '', label: '' },
  endpoints: [],
  currentEndpoint: { key: '', label: '' },
  instances: [],
  currentInstance: { key: '', label: '' },
  databases: [],
  currentDatabase: { key: '', label: '' },
  updateDashboard: { key: '' },
  pageType: '',
  destService: { key: '', label: '' },
  destInstance: { key: '', label: '' },
  destEndpoint: { key: '', label: '' },
  selectorErrors: {},
};

// mutations
const mutations: MutationTree<State> = {
  [types.SET_SERVICES](state: State, data: Option[]) {
    const pageTypes = [PageTypes.LOG, PageTypes.EVENT] as string[];
    state.services = pageTypes.includes(state.pageType) ? [{ label: 'All', key: '' }, ...data] : data;
    state.currentService = state.services[0] || {};
  },
  [types.SET_CURRENT_SERVICE](state: State, service: Option) {
    state.currentService = service;
    const pageTypes = [PageTypes.LOG, PageTypes.EVENT] as string[];
    if (pageTypes.includes(state.pageType)) {
      state.updateDashboard = service;
    }
  },

  [types.UPDATE_DASHBOARD](state: State, param?: { key: string }) {
    state.updateDashboard = param || { key: String(new Date().getTime()) };
  },

  [types.SET_ENDPOINTS](state: State, data: Option[]) {
    const pageTypes = [PageTypes.LOG, PageTypes.EVENT] as string[];
    state.endpoints = pageTypes.includes(state.pageType) ? [{ label: 'All', key: '' }, ...data] : data;
    if (!state.endpoints.length) {
      state.currentEndpoint = { key: '', label: '' };
      return;
    }
    state.currentEndpoint = state.endpoints[0];
  },
  [types.SET_CURRENT_ENDPOINT](state: State, endpoint: Option) {
    state.currentEndpoint = endpoint;
    state.updateDashboard = endpoint;
  },
  [types.SET_INSTANCES](state: State, data: Option[]) {
    const pageTypes = [PageTypes.LOG, PageTypes.EVENT] as string[];
    state.instances = pageTypes.includes(state.pageType) ? [{ label: 'All', key: '' }, ...data] : data;
    if (!state.instances.length) {
      state.currentInstance = { key: '', label: '' };
      return;
    }
    state.currentInstance = state.instances[0];
  },
  [types.SET_CURRENT_INSTANCE](state: State, instance: Option) {
    state.currentInstance = instance;
    state.updateDashboard = instance;
  },
  [types.SET_DATABASES](state: State, data: Option[]) {
    state.databases = data;
    if (!data.length) {
      state.currentDatabase = { key: '', label: '' };
      return;
    }
    state.currentDatabase = data[0];
  },
  [types.SET_CURRENT_DATABASE](state: State, service: Option) {
    state.currentDatabase = service;
    state.updateDashboard = service;
  },
  [types.SET_PAGE_TYPE](state: State, type: string) {
    state.pageType = type;
  },
  [types.SET_SERVICE_DEPENDENCY](state: State, call: any) {
    state.currentService = { key: call.source.id, label: call.source.name };
    state.destService = { key: call.target.id, label: call.target.name };
    state.updateDashboard = { key: TopologyType.TOPOLOGY_SERVICE_DEPENDENCY + call.id };
  },
  [types.SET_SERVICE_INSTANCE_DEPENDENCY](state: State, call: any) {
    state.currentService = { key: call.sourceObj.serviceId, label: call.sourceObj.serviceName };
    state.currentInstance = { key: call.sourceObj.id, label: call.sourceObj.name };
    state.destService = { key: call.targetObj.serviceId, label: call.targetObj.serviceName };
    state.destInstance = { key: call.targetObj.id, label: call.targetObj.name };
    state.updateDashboard = { key: TopologyType.TOPOLOGY_SERVICE_INSTANCE_DEPENDENCY + call.id };
  },
  [types.SET_ENDPOINT_DEPENDENCY](state: State, call: any) {
    state.currentService = { key: call.serviceId, label: call.serviceName };
    state.currentEndpoint = { key: call.endpointId, label: call.endpointName };
    state.destService = { key: call.destServiceId, label: call.destServiceName };
    state.destEndpoint = { key: call.destEndpointId, label: call.destEndpointName };
    state.updateDashboard = { key: TopologyType.TOPOLOGY_ENDPOINT_DEPENDENCY + call.id };
  },
  [types.SET_SELECTOR_ERRORS](state: State, data: { msg: string; desc: string }) {
    state.selectorErrors = {
      ...state.selectorErrors,
      [data.msg]: data.desc,
    };
  },
};

// actions
const actions: ActionTree<State, any> = {
  GET_SERVICES(context: { commit: Commit }, params: { duration: DurationTime; keyword: string }) {
    if (!params.keyword) {
      params.keyword = '';
    }
    return graph
      .query('queryServices')
      .params(params)
      .then((res: AxiosResponse) => {
        context.commit(types.SET_SELECTOR_ERRORS, { msg: 'serviceErrors', desc: res.data.errors || '' });
        if (res.data.errors) {
          context.commit(types.SET_SERVICES, []);
          return;
        }
        context.commit(types.SET_SERVICES, res.data.data.services);
      });
  },
  GET_SERVICE_ENDPOINTS(
    context: { commit: Commit; state: State },
    params: { keyword: string; currentService?: { key: string; label: string } },
  ) {
    if (!context.state.currentService.key) {
      context.commit(types.SET_ENDPOINTS, []);
      return;
    }
    if (!params.keyword) {
      params.keyword = '';
    }
    return graph
      .query('queryEndpoints')
      .params({
        serviceId: (params.currentService ? params.currentService.key : context.state.currentService.key) || '',
        keyword: params.keyword,
      })
      .then((res: AxiosResponse) => {
        context.commit(types.SET_SELECTOR_ERRORS, { msg: 'endpointErrors', desc: res.data.errors || '' });
        if (res.data.errors) {
          context.commit(types.SET_ENDPOINTS, []);
          return;
        }
        context.commit(types.SET_ENDPOINTS, res.data.data.getEndpoints);
      });
  },
  GET_SERVICE_INSTANCES(context: { commit: Commit; state: State }, params: any) {
    if (!context.state.currentService.key) {
      context.commit(types.SET_INSTANCES, []);
      return;
    }
    return graph
      .query('queryInstances')
      .params({ serviceId: context.state.currentService.key || '', ...params })
      .then((res: AxiosResponse) => {
        context.commit(types.SET_SELECTOR_ERRORS, { msg: 'instanceErrors', desc: res.data.errors || '' });
        if (res.data.errors) {
          context.commit(types.SET_INSTANCES, []);
          return;
        }
        context.commit(types.SET_INSTANCES, res.data.data.getServiceInstances);
      });
  },
  GET_DATABASES(context: { commit: Commit; rootState: any }, params: any) {
    return graph
      .query('queryDatabases')
      .params(params)
      .then((res: AxiosResponse) => {
        context.commit(types.SET_SELECTOR_ERRORS, { msg: 'databaseErrors', desc: res.data.errors || '' });
        if (res.data.errors) {
          context.commit(types.SET_DATABASES, []);
          return;
        }
        context.commit(types.SET_DATABASES, res.data.data.services);
      });
  },
  SELECT_SERVICE(
    context: { commit: Commit; dispatch: Dispatch; state: State },
    params: { service: Option; duration: DurationTime; callback?: any },
  ) {
    context.commit('SET_CURRENT_SERVICE', params.service);
    context.dispatch('GET_SERVICE_ENDPOINTS', {}).then(() => {
      if (context.state.pageType !== PageTypes.DASHBOARD || !params.callback) {
        return;
      }
      params.callback({
        condition: {
          time: params.duration,
          size: 20,
          source: {
            service: params.service.label,
            endpoint: context.state.currentEndpoint.label,
          },
        },
        type: EntityType[2],
      });
    });
    context.dispatch('GET_SERVICE_INSTANCES', { duration: params.duration }).then(() => {
      if (context.state.pageType === PageTypes.DASHBOARD && !params.callback) {
        context.commit('UPDATE_DASHBOARD', params.service);
      }
      if (context.state.pageType !== PageTypes.DASHBOARD || !params.callback) {
        return;
      }
      params
        .callback({
          condition: {
            time: params.duration,
            size: 20,
            source: {
              service: params.service.label,
              serviceInstance: context.state.currentInstance.label,
            },
          },
          type: EntityType[1],
        })
        .then(() => {
          context.commit('UPDATE_DASHBOARD', params.service);
        });
    });
  },
  SELECT_ENDPOINT(context: { commit: Commit; dispatch: Dispatch; state: State; rootState: any }, params: any) {
    context.commit('SET_CURRENT_ENDPOINT', params.endpoint);
  },
  SELECT_INSTANCE(context: { commit: Commit; dispatch: Dispatch; state: State; rootState: any }, params: any) {
    context.commit('SET_CURRENT_INSTANCE', params.instance);
  },
  SELECT_DATABASE(context: { commit: Commit; dispatch: Dispatch }, params: any) {
    context.commit('SET_CURRENT_DATABASE', params);
    context.dispatch('RUN_EVENTS', {}, { root: true });
  },
  MIXHANDLE_GET_OPTION(
    context: { dispatch: Dispatch; commit: Commit },
    params: {
      compType: string;
      duration: Duration;
      keywordServiceName?: string;
      pageType?: string;
    },
  ) {
    context.commit('SET_PAGE_TYPE', params.pageType);
    switch (params.compType) {
      case 'service':
        return context
          .dispatch('GET_SERVICES', { duration: params.duration, keyword: params.keywordServiceName })
          .then(() => context.dispatch('GET_SERVICE_ENDPOINTS', {}))
          .then(() => context.dispatch('GET_SERVICE_INSTANCES', { duration: params.duration }));
      case 'database':
        return context.dispatch('GET_DATABASES', { duration: params.duration });
      case 'browser':
        return context
          .dispatch('GET_BROWSER_SERVICES', { duration: params.duration, keyword: params.keywordServiceName })
          .then(() => context.dispatch('GET_SERVICE_ENDPOINTS', {}))
          .then(() => context.dispatch('GET_SERVICE_INSTANCES', { duration: params.duration }));
      default:
        break;
    }
  },
  GET_BROWSER_SERVICES(context: { commit: Commit }, params: { duration: any }) {
    return graph
      .query('queryBrowserServices')
      .params(params)
      .then((res: AxiosResponse) => {
        context.commit(types.SET_SERVICES, res.data.data.services);
      });
  },
  GET_ITEM_ENDPOINTS(context, params) {
    if (!params.keyword) {
      params.keyword = '';
    }
    return graph
      .query('queryEndpoints')
      .params(params)
      .then((res: AxiosResponse) => {
        context.commit(types.SET_SELECTOR_ERRORS, { msg: 'itemEndpointErrors', desc: res.data.errors || '' });
        if (res.data.errors) {
          return [];
        }
        return res.data.data.getEndpoints;
      });
  },
  GET_ITEM_INSTANCES(context, params) {
    return graph
      .query('queryInstances')
      .params(params)
      .then((res: AxiosResponse) => {
        context.commit(types.SET_SELECTOR_ERRORS, { msg: 'itemInstanceErrors', desc: res.data.errors || '' });
        if (res.data.errors) {
          return [];
        }
        return res.data.data.getServiceInstances;
      });
  },
  GET_ITEM_SERVICES(context, params: { duration: DurationTime; keyword: string }) {
    if (!params.keyword) {
      params.keyword = '';
    }
    return graph
      .query('queryServices')
      .params(params)
      .then((res: AxiosResponse) => {
        context.commit(types.SET_SELECTOR_ERRORS, { msg: 'itemServiceErrors', desc: res.data.errors || '' });
        if (res.data.errors) {
          return [];
        }
        return res.data.data.services;
      });
  },
};

export default {
  state: initState,
  actions,
  mutations,
};
