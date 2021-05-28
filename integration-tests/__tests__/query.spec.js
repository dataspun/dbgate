const engines = require('../engines');
const { testWrapper } = require('../tools');

const initSql = ['CREATE TABLE t1 (id int)', 'INSERT INTO t1 (id) VALUES (1)', 'INSERT INTO t1 (id) VALUES (2)'];

expect.extend({
  dataRow(row, expected) {
    for (const key in expected) {
      if (row[key] != expected[key]) {
        return {
          pass: false,
          message: () => `Different key: ${key}`,
        };
      }
    }
    return {
      pass: true,
      message: () => '',
    };
  },
});

class StreamHandler {
  constructor(resolve) {
    this.results = [];
    this.resolve = resolve;
    this.infoRows = [];
  }
  row(row) {
    this.results[this.results.length - 1].rows.push(row);
  }
  recordset(columns) {
    this.results.push({
      columns,
      rows: [],
    });
  }
  done(result) {
    this.resolve(this.results);
  }
  info(msg) {
    this.infoRows.push(msg);
  }
}

function executeStream(driver, conn, sql) {
  return new Promise(resolve => {
    const handler = new StreamHandler(resolve);
    driver.stream(conn, sql, handler);
  });
}

describe('Query', () => {
  test.each(engines.map(engine => [engine.label, engine]))(
    'Simple query - %s',
    testWrapper(async (conn, driver, engine) => {
      for (const sql of initSql) await driver.query(conn, sql);

      const res = await driver.query(conn, 'SELECT id FROM t1 ORDER BY id');
      expect(res.columns).toEqual([
        expect.objectContaining({
          columnName: 'id',
        }),
      ]);

      expect(res.rows).toEqual([
        expect.dataRow({
          id: 1,
        }),
        expect.dataRow({
          id: 2,
        }),
      ]);
    })
  );

  test.each(engines.map(engine => [engine.label, engine]))(
    'Simple stream query - %s',
    testWrapper(async (conn, driver, engine) => {
      for (const sql of initSql) await driver.query(conn, sql);
      const results = await executeStream(driver, conn, 'SELECT id FROM t1 ORDER BY id');
      expect(results.length).toEqual(1);
      const res = results[0];

      expect(res.columns).toEqual([expect.objectContaining({ columnName: 'id' })]);
      expect(res.rows).toEqual([expect.dataRow({ id: 1 }), expect.dataRow({ id: 2 })]);
    })
  );

  test.each(engines.map(engine => [engine.label, engine]))(
    'Combined query - %s',
    testWrapper(async (conn, driver, engine) => {
      for (const sql of initSql) await driver.query(conn, sql);
      const results = await executeStream(
        driver,
        conn,
        'SELECT id FROM t1 ORDER BY id; SELECT id FROM t1 ORDER BY id DESC'
      );
      expect(results.length).toEqual(2);

      const res1 = results[0];
      expect(res1.columns).toEqual([expect.objectContaining({ columnName: 'id' })]);
      expect(res1.rows).toEqual([expect.dataRow({ id: 1 }), expect.dataRow({ id: 2 })]);

      const res2 = results[1];
      expect(res2.columns).toEqual([expect.objectContaining({ columnName: 'id' })]);
      expect(res2.rows).toEqual([expect.dataRow({ id: 2 }), expect.dataRow({ id: 1 })]);
    })
  );
});