/* eslint-disable no-unused-expressions */
const { describe, it, afterEach } = require('mocha')
const { expect } = require('chai')
const DB = require('../src/generators')
const fs = require('fs')
const path = require('path')
const appRoot = require('app-root-path').path
let db = null

describe('Database Basics', function () {
  afterEach(async () => {
    db && await db.close()
    db = null
    try {
      fs.unlinkSync(path.resolve(appRoot, './data/sqlite3.db'))
      fs.rmdirSync(path.resolve(appRoot, './data'))
    } catch (e) {}
  })

  it('should create a sqlite3.db-file', async function () {
    db = new DB({
      migrate: false
    })
    await db.connection()
    await db.close()
    const result = fs.existsSync(path.resolve(appRoot, './data/sqlite3.db'))

    expect(result).to.be.true
  })

  it('should run queries with run', async function () {
    db = new DB({
      migrate: false
    })

    expect(await db.run('SELECT 1')).to.not.throw
  })

  it('should exec many queries with exec', async function () {
    db = new DB({
      migrate: false
    })

    expect(await db.exec('SELECT 1; SELECT 2')).to.not.throw
  })

  it('should return all rows with query', async function () {
    db = new DB({
      migrate: false
    })
    expect(await db.query('SELECT ? as `1` UNION SELECT ? as `1`', 1, 2)).to.deep.equal([{ 1: 1 }, { 1: 2 }])
  })

  it('should return first row with queryFirstRow', async function () {
    db = new DB({
      migrate: false
    })
    expect(await db.queryFirstRow('SELECT ? as `1` UNION SELECT ? as `1`', 1, 2)).to.deep.equal({ 1: 1 })
  })

  it('should return first cell with queryFirstCell', async function () {
    db = new DB({
      migrate: false
    })
    expect(await db.queryFirstCell('SELECT ?', 1)).to.equal(1)
  })

  it('should return undefined when queryFirstCell does not hit', async function () {
    db = new DB({
      migrate: false
    })

    expect(await db.queryFirstCell('SELECT 1 WHERE 1=0')).to.be.undefined
  })

  it('should return iterate over the rows with queryIterate', async function () {
    db = new DB({
      migrate: false
    })
    const result = []
    for await (const v of db.queryIterate('SELECT ? as `1` UNION SELECT ? as `1`', 1, 2)) {
      result.push(v['1'])
    }
    expect(result).to.deep.equal([1, 2])
  })

  it('should call a callback over the rows with each', async function () {
    db = new DB({
      migrate: false
    })
    const result = []
    await db.each('SELECT ? as `1` UNION SELECT ? as `1`', 1, 2, row => {
      result.push(row['1'])
    })
    expect(result).to.deep.equal([1, 2])
  })

  it('should return a column with queryColumn', async function () {
    db = new DB({
      migrate: false
    })
    expect(await db.queryColumn('2', 'SELECT ? as `1`, ? as `2` UNION SELECT ? as `1`, ? as `2`', 1, 2, 3, 4)).to.deep.equal([2, 4])
  })

  it('should return a object with key and value from columns defined in queryKeyAndColumn', async function () {
    db = new DB({
      migrate: false
    })
    expect(await db.queryKeyAndColumn('1', '2', 'SELECT ? as `1`, ? as `2` UNION SELECT ? as `1`, ? as `2`', 1, 2, 3, 4)).to.deep.equal({ 1: 2, 3: 4 })
  })

  it('should migrate files', async function () {
    db = new DB({
      migrate: {
        migrationsPath: './test/migrations'
      }
    })
    expect(await db.queryFirstCell('SELECT `value` FROM Setting WHERE `key` = ?', 'test')).to.be.equal('now')
  })
})
