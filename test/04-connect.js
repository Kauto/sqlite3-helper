/* eslint-disable no-unused-expressions */
const { describe, it, afterEach } = require('mocha')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const { expect } = chai

const DB = require('../src/generators')
const fs = require('fs')
const path = require('path')
let db = null

describe('Database Connection Mode Tests', function () {
  afterEach(async () => {
    db && await db.close()
    db = null
    try {
      fs.unlinkSync(path.resolve(process.cwd(), './data/sqlite3.db'))
      fs.rmdirSync(path.resolve(process.cwd(), './data'))
    } catch (e) {}
  })

  it('should throw if fileMustExist is true and there is no file', async function () {
    db = new DB({
      migrate: false,
      fileMustExist: true
    })

    // test that error happens when file does not exist
    await expect(db.connection()).to.be.rejectedWith(/^DB file doesn't exist: /)
  })

  it('should not throw if fileMustExist is true and there is a file', async function () {
    // create file
    db = new DB({
      migrate: {
        migrationsPath: './test/migrations'
      }
    })
    await db.connection()
    await db.close()

    // test that everything works
    db = new DB({
      migrate: false,
      fileMustExist: true
    })

    await expect(db.connection()).to.not.be.rejected
  })

  it('should work with memory: true', async function () {
    // create db
    db = new DB({
      migrate: {
        migrationsPath: './test/migrations'
      },
      memory: true
    })
    await db.connection()
    await db.close()
    // no file was generated
    const result = fs.existsSync(path.resolve(process.cwd(), './data/sqlite3.db'))
    expect(result).to.be.false
  })

  it('should work with readOnly: true and existing db', async function () {
    // create db
    db = new DB({
      migrate: {
        migrationsPath: './test/migrations'
      }
    })
    await db.connection()
    await db.close()

    // create db
    db = new DB({
      migrate: false,
      readOnly: true
    })
    await expect(db.connection()).to.not.be.rejected

    expect(await db.queryFirstCell('SELECT `value` FROM Setting WHERE `key` = ?', 'test')).to.be.equal('now')
  })

  it('should forbid writing with readOnly: true', async function () {
    // create db
    db = new DB({
      migrate: {
        migrationsPath: './test/migrations'
      }
    })
    await db.connection()
    await db.close()

    // create db
    db = new DB({
      migrate: false,
      readOnly: true
    })
    await expect(db.connection()).to.not.be.rejected

    await expect(db.update('Setting', {
      value: '1234'
    }, {
      key: 'test',
      value: 'now'
    })).to.be.rejectedWith(/^SQLITE_READONLY/)
  })

  it('will not work with readOnly: true and non existing db', async function () {
    // create db
    db = new DB({
      migration: false,
      readOnly: true
    })
    await expect(db.connection()).to.be.rejectedWith(/^SQLITE_CANTOPEN/)
  })
})
