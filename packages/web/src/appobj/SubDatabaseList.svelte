<script lang="ts">
  import { filterName, getConnectionLabel } from 'dbgate-tools';
  import _ from 'lodash';
  import { useDatabaseList } from '../utility/metadataLoaders';
  import AppObjectList from './AppObjectList.svelte';
  import * as databaseAppObject from './DatabaseAppObject.svelte';
  import { volatileConnectionMapStore } from '../utility/api';
  import { getLocalStorage } from '../utility/storageCache';

  export let filter;
  export let data;
  export let passProps;

  export let isExpandedOnlyBySearch;

  $: databases = useDatabaseList({ conid: isExpandedOnlyBySearch ? null : data._id });
  $: dbList = isExpandedOnlyBySearch ? getLocalStorage(`database_list_${data._id}`) || [] : $databases || [];
</script>

<AppObjectList
  list={_.sortBy(
    dbList.filter(x => filterName(filter, x.name, data.displayName, data.server)),
    x => x.sortOrder ?? x.name
  ).map(db => ({ ...db, connection: data }))}
  module={databaseAppObject}
  {passProps}
/>
