<!-- Licensed to the Apache Software Foundation (ASF) under one or more
contributor license agreements.  See the NOTICE file distributed with
this work for additional information regarding copyright ownership.
The ASF licenses this file to You under the Apache License, Version 2.0
(the "License"); you may not use this file except in compliance with
the License.  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License. -->
<template>
  <div id="app">
    <RkHeader @reloadFooter="reloadFooter" />
    <router-view></router-view>
    <RkFooter ref="footer" />
    <AlertsContent />
  </div>
</template>

<script lang="ts">
  import { Component, Vue } from 'vue-property-decorator';
  import { State } from 'vuex-class';
  import { State as optionState } from '@/store/modules/global/selectors';
  import RkHeader from '@/views/components/common/rk-header.vue';
  import RkFooter from '@/views/components/common/rk-footer.vue';
  import AlertsContent from '@/views/components/common/alerts-content.vue';

  @Component({
    components: {
      RkHeader,
      RkFooter,
      AlertsContent,
    },
  })
  export default class RouterIndex extends Vue {
    @State('rocketOption') private stateDashboardOption!: optionState;
    private isRouterAlive: boolean = true;
    public reloadFooter(timeArray: Date[]): void {
      const footer: any = this.$refs.footer;
      footer.time = timeArray;
    }
  }
</script>
