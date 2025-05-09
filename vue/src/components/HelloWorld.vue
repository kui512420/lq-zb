<template>
  <div>
    <table>
      <thead>
        <tr>
          <th v-for="(header, index) in tableHeaders" :key="index">{{ header }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, rowIndex) in tableData" :key="rowIndex" :class="{ 'even-row': rowIndex % 2 === 0, 'odd-row': rowIndex % 2!== 0 }">
          <td v-for="(cell, cellIndex) in row" :key="cellIndex">{{ cell }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref } from 'vue';

// 表格表头数据
const tableHeaders = ref(['列1', '列2', '列3']);

// 表格内容数据
const tableData = ref([
  ['数据1-1', '数据1-2', '数据1-3'],
  ['数据2-1', '数据2-2', '数据2-3'],
  ['数据3-1', '数据3-2', '数据3-3'],
  ['数据4-1', '数据4-2', '数据4-3'],
]);
</script>

<style scoped>
table {
  border-collapse: collapse;
  width: 100%;
}

th,
td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}

.even-row {
  background-color: #f2f2f2;
}

.odd-row {
  background-color: #ffffff;
}
</style>    