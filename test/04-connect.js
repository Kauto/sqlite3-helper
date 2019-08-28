const { describe, it, afterEach } = require('mocha')
const { expect } = require('chai')
const DB = require('../src/generators')
const fs = require('fs')
const path = require('path')
const appRoot = require('app-root-path').path
let db = null

describe('Database Connection Mode Tests', function () {
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
    db.close()
    const result = fs.existsSync(path.resolve(appRoot, './data/sqlite3.db'))
    // eslint-disable-next-line no-unused-expressions
    expect(result).to.be.true
  })
})
