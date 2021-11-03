const { describe, it, afterEach } = require('mocha')
const { expect } = require('chai')
const DB = require('../src/generators')
const fs = require('fs')
const path = require('path')
let db = null

describe('Database Update', function () {
  afterEach(async () => {
    db && await db.close()
    db = null
    try {
      fs.unlinkSync(path.resolve(process.cwd(), './data/sqlite3.db'))
      fs.rmdirSync(path.resolve(process.cwd(), './data'))
    } catch (e) {}
  })

  it('can update with object as where', async function () {
    db = new DB({
      migrate: {
        migrationsPath: './test/migrations'
      }
    })
    expect(await db.update('Setting', {
      value: '1234'
    }, {
      key: 'test',
      value: 'now'
    })).to.be.equal(1)
  })

  it('can update with array as where', async function () {
    db = new DB({
      migrate: {
        migrationsPath: './test/migrations'
      }
    })
    expect(await db.update('Setting', {
      key: 'test2',
      value: '1234'
    }, ['`key` = ? AND `value` = ?', 'test', 'now'])).to.be.equal(1)

    expect(await db.queryFirstCell('SELECT COUNT(1) FROM Setting WHERE key = ?', 'test2')).to.be.equal(1)
  })

  it('can update with whitelist', async function () {
    db = new DB({
      migrate: {
        migrationsPath: './test/migrations'
      }
    })
    expect(await db.update('Setting', {
      key: 'test2',
      value: '1234'
    }, ['`key` = ? AND `value` = ?', 'test', 'now'], ['key'])).to.be.equal(1)

    // eslint-disable-next-line no-unused-expressions
    expect(await db.queryFirstCell('SELECT value FROM Setting WHERE key = ?', 'test2')).to.be.equal('now')
  })

  it('can update with blacklist', async function () {
    db = new DB({
      migrate: {
        migrationsPath: './test/migrations'
      }
    })
    expect(await db.updateWithBlackList('Setting', {
      key: 'test2',
      value: '1234'
    }, ['`key` = ? AND `value` = ?', 'test', 'now'], ['key', 'fasdasd'])).to.be.equal(1)

    expect(await db.queryFirstCell('SELECT value FROM Setting WHERE key = ?', 'test')).to.equal('1234')
  })
})
