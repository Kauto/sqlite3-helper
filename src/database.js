const sqlite3 = require('sqlite3')
const path = require('path')
const fs = require('fs')
const mkdirp = require('mkdirp')
const AwaitLock = require('await-lock')
const appRoot = require('app-root-path').path
const Statement = require('./statement')

const dbFile = path.resolve(appRoot, './data/sqlite3.db')

let instance = null

/**
 * Class to control database-connections
 *
 * @returns {DB}
 * @constructor
 */
function DB (options = {}) {
  if (!(this instanceof DB)) {
    instance = instance || new DB(...arguments)
    return instance
  }
  this.options = Object.assign({
    path: dbFile,
    migrate: true,
    WAL: true
  }, options)
  this.awaitLock = new AwaitLock()
}

DB.prototype.connection = async function () {
  await this.awaitLock.acquireAsync()
  if (this.db) {
    this.awaitLock.release()
    return this.db
  }
  try {
    // create path if it doesn't exists
    mkdirp.sync(path.dirname(this.options.path))
    this.db = await new Promise((resolve, reject) => {
      const db = new sqlite3.Database(this.options.path, (err) => err ? reject(err) : resolve(db))
    })
  } catch (e) {
    this.db = undefined
    this.awaitLock.release()
    throw e
  }
  if (this.options.WAL) {
    await new Promise((resolve, reject) => this.db.exec('PRAGMA journal_mode = WAL', (err) => err ? reject(err) : resolve()))
  }
  if (this.options.migrate) {
    await this.migrate(typeof this.options.migrate === 'object' ? this.options.migrate : {})
  }
  this.awaitLock.release()
  return this.db
}

DB.prototype.prepare = async function (sql, ...params) {
  const db = await this.connection()
  return new Promise((resolve, reject) => {
    const orgStatement = db.prepare(sql, ...params, (err) => {
      err ? reject(err) : resolve(new Statement(orgStatement))
    })
  })
}

DB.prototype.exec = async function (source) {
  const db = await this.connection()
  return new Promise((resolve, reject) => db.exec(source, function (err) {
    err ? reject(err) : resolve(this)
  }))
}

DB.prototype.loadExtension = function (...args) {
  return this.connection().loadExtension(...args)
}

DB.prototype.close = async function () {
  if (this.db) {
    const databaseToClose = this.db
    this.db = undefined
    if (this === instance) instance = null
    return new Promise((resolve, reject) => {
      function tryToClose (tries) {
        databaseToClose.close((err) => {
          if (err) {
            if (err.code === 'SQLITE_BUSY' && tries) {
              setTimeout(() => tryToClose(tries - 1), 50)
            } else {
              reject(err)
            }
          } else {
            resolve(null)
          }
        })
      }
      tryToClose(10)
    })
  }
}

DB.prototype.defaultSafeIntegers = function (toggleState) {
  return this.connection().defaultSafeIntegers(toggleState)
}

/**
 * Executes the prepared statement. When execution completes it returns an info object describing any changes made. The info object has two properties:
 *
 * info.changes: The total number of rows that were inserted, updated, or deleted by this operation. Changes made by foreign key actions or trigger programs do not count.
 * info.lastID: The rowid of the last row inserted into the database (ignoring those caused by trigger programs). If the current statement did not insert any rows into the database, this number should be completely ignored.
 *
 * If execution of the statement fails, an Error is thrown.
 * @see https://github.com/JoshuaWise/better-sqlite3/wiki/API#runbindparameters---object
 *
 * @param {Object} query the SQL-Query that should be run. Can contain placeholders for bind parameters.
 * @param {any} bindParameters You can specify bind parameters @see https://github.com/JoshuaWise/better-sqlite3/wiki/API#binding-parameters
 * @returns {object}
 */
DB.prototype.run = async function (query, ...bindParameters) {
  const db = await this.connection()
  return new Promise((resolve, reject) => {
    db.run(query, ...bindParameters, function (err) {
      err ? reject(err) : resolve(this)
    })
  })
}

/**
 * Returns all values of a query
 * @see https://github.com/JoshuaWise/better-sqlite3/wiki/API#allbindparameters---array-of-rows
 *
 * @param {Object} query the SQL-Query that should be run. Can contain placeholders for bind parameters.
 * @param {any} bindParameters You can specify bind parameters @see https://github.com/JoshuaWise/better-sqlite3/wiki/API#binding-parameters
 * @returns {array}
 */
DB.prototype.query = async function (query, ...bindParameters) {
  const db = await this.connection()
  return new Promise((resolve, reject) => db.all(query, ...bindParameters, (err, rows) => err ? reject(err) : resolve(rows)))
}

/**
 * Returns the values of the first row of the query-result
 * @see https://github.com/JoshuaWise/better-sqlite3/wiki/API#getbindparameters---row
 *
 * @param {Object} query the SQL-Query that should be run. Can contain placeholders for bind parameters.
 * @param {any} bindParameters You can specify bind parameters @see https://github.com/JoshuaWise/better-sqlite3/wiki/API#binding-parameters
 * @returns {Object|null}
 */
DB.prototype.queryFirstRow = async function (query, ...bindParameters) {
  const db = await this.connection()
  return new Promise((resolve, reject) => db.get(query, ...bindParameters, (err, row) => err ? reject(err) : resolve(row)))
}

/**
 * Returns the values of the first row of the query-result
 * @see https://github.com/JoshuaWise/better-sqlite3/wiki/API#getbindparameters---row
 * It returns always an object and thus can be used with destructuring assignment
 *
 * @example const {id, name} = DB().queryFirstRowObject(sql)
 * @param {Object} query the SQL-Query that should be run. Can contain placeholders for bind parameters.
 * @param {any} bindParameters You can specify bind parameters @see https://github.com/JoshuaWise/better-sqlite3/wiki/API#binding-parameters
 * @returns {Object}
 */
DB.prototype.queryFirstRowObject = async function (query, ...bindParameters) {
  const db = await this.connection()
  return new Promise((resolve, reject) => db.get(query, ...bindParameters, (err, row) => err ? reject(err) : resolve(row || {})))
}

/**
 * Returns the value of the first column in the first row of the query-result
 *
 * @param {Object} query the SQL-Query that should be run. Can contain placeholders for bind parameters.
 * @param {any} bindParameters You can specify bind parameters @see https://github.com/JoshuaWise/better-sqlite3/wiki/API#binding-parameters
 * @returns {any}
 */
DB.prototype.queryFirstCell = async function (query, ...bindParameters) {
  const db = await this.connection()
  return new Promise((resolve, reject) => db.get(query, ...bindParameters, (err, row) => {
    if (err) {
      reject(err)
      return
    }
    if (!row) {
      resolve(undefined)
      return
    }
    const keys = Object.keys(row)
    resolve(keys.length ? row[keys[0]] : undefined)
  }))
}

/**
 * Calls a callback for every row
 *
 * @param {Object} query the SQL-Query that should be run. Can contain placeholders for bind parameters.
 * @param {any} bindParameters You can specify bind parameters @see https://github.com/JoshuaWise/better-sqlite3/wiki/API#binding-parameters
 * @param {any} callback the callback that is called
 * @returns {integer} count
 */
DB.prototype.each = async function (query, ...bindParameters) {
  let callback = () => {}
  if (typeof bindParameters[bindParameters.length - 1] === 'function') {
    callback = bindParameters.pop()
  }
  const db = await this.connection()
  return new Promise((resolve, reject) => {
    db.each(query, ...bindParameters, (err, row) => err ? reject(err) : callback(row), (err, count) => {
      err ? reject(err) : resolve(count)
    })
  })
}

/**
 * Returns an Array that only contains the values of the specified column
 *
 * @param {Object} column Name of the column
 * @param {Object} query the SQL-Query that should be run. Can contain placeholders for bind parameters.
 * @param {any} bindParameters You can specify bind parameters @see https://github.com/JoshuaWise/better-sqlite3/wiki/API#binding-parameters
 * @returns {array}
 */
DB.prototype.queryColumn = async function (column, query, ...bindParameters) {
  const result = []
  await this.each(query, ...bindParameters, row => {
    result[result.length] = row[column]
  })
  return result
}

/**
 * Returns a Object that get it key-value-combination from the result of the query
 *
 * @param {String} key Name of the column that values should be the key
 * @param {Object} column Name of the column that values should be the value for the object
 * @param {Object} query the SQL-Query that should be run. Can contain placeholders for bind parameters.
 * @param {any} bindParameters You can specify bind parameters @see https://github.com/JoshuaWise/better-sqlite3/wiki/API#binding-parameters
 * @returns {object}
 */
DB.prototype.queryKeyAndColumn = async function (key, column, query, ...bindParameters) {
  const result = {}
  await this.each(query, ...bindParameters, row => {
    result[row[key]] = row[column]
  })
  return result
}

/**
 * Create an update statement; create more complex one with exec yourself.
 *
 * @param {String} table Name of the table
 * @param {Object} data a Object of data to set. Key is the name of the column. Value 'undefined' is filtered
 * @param {String|Array|Object} where required. array with a string and the replacements for ? after that. F.e. ['id > ? && name = ?', id, name]. Or an object with key values. F.e. {id: params.id}. Or simply an ID that will be translated to ['id = ?', id]
 * @param {undefined|Array} whiteList optional List of columns that can only be updated with "data"
 * @returns {Integer}
 */
DB.prototype.update = async function (table, data, where, whiteList) {
  if (!where) {
    throw new Error('Where is missing for the update command of DB()')
  }
  if (!table) {
    throw new Error('Table is missing for the update command of DB()')
  }
  if (!typeof data === 'object' || !Object.keys(data).length) {
    return 0
  }

  // Build start of where query
  let sql = `UPDATE \`${table}\` SET `
  let parameter = []

  // Build data part of the query
  const setStringBuilder = []
  for (const keyOfData in data) {
    const value = data[keyOfData]
    // don't set undefined and only values in an optional whitelist
    if (value !== undefined && (!whiteList || whiteList.includes(keyOfData))) {
      parameter.push(value)
      setStringBuilder.push(`\`${keyOfData}\` = ?`)
    }
  }
  if (!setStringBuilder.length) {
    // nothing to update
    return 0
  }
  sql += setStringBuilder.join(', ')

  // Build where part of query
  sql += ' WHERE '
  if (Array.isArray(where)) {
    const [whereTerm, ...whereParameter] = where
    sql += whereTerm
    parameter = [...parameter, ...whereParameter]
  } else if (typeof where === 'object') {
    const whereStringBuilder = []
    for (const keyOfWhere in where) {
      const value = where[keyOfWhere]
      if (value !== undefined) {
        parameter.push(value)
        whereStringBuilder.push(`\`${keyOfWhere}\` = ?`)
      }
    }
    if (!whereStringBuilder.length) {
      throw new Error('Where is not constructed for the update command of DB()')
    }
    sql += whereStringBuilder.join(' AND ')
  } else {
    sql += 'id = ?'
    parameter.push(where)
  }

  return (await this.run(
    sql,
    ...parameter
  )).changes
}

/**
 * Create an update statement; create more complex one with exec yourself.
 *
 * @param {String} table Name of the table
 * @param {Object} data a Object of data to set. Key is the name of the column. Value 'undefined' is filtered
 * @param {String|Array|Object} where required. array with a string and the replacements for ? after that. F.e. ['id > ? && name = ?', id, name]. Or an object with key values. F.e. {id: params.id}. Or simply an ID that will be translated to ['id = ?', id]
 * @param {undefined|Array} whiteBlackList optional List of columns that can not be updated with "data" (blacklist)
 * @returns {Integer}
 */
DB.prototype.updateWithBlackList = async function (table, data, where, blackList) {
  return this.update(table, data, where, await createWhiteListByBlackList.bind(this)(table, blackList))
}

/**
 * Create an insert statement; create more complex one with exec yourself.
 *
 * @param {String} table Name of the table
 * @param {Object|Array} data a Object of data to set. Key is the name of the column. Can be an array of objects.
 * @param {undefined|Array} whiteList optional List of columns that only can be updated with "data"
 * @returns {Integer}
 */
DB.prototype.insert = async function (table, data, whiteList) {
  return (await this.run(
    ...createInsertOrReplaceStatement('INSERT', table, data, whiteList)
  )).lastID
}

/**
 * Create an insert statement; create more complex one with exec yourself.
 *
 * @param {String} table Name of the table
 * @param {Object|Array} data a Object of data to set. Key is the name of the column. Can be an array of objects.
 * @param {undefined|Array} whiteBlackList optional List of columns that can not be updated with "data" (blacklist)
 * @returns {Integer}
 */
DB.prototype.insertWithBlackList = async function (table, data, blackList) {
  return this.insert(table, data, await createWhiteListByBlackList.bind(this)(table, blackList))
}

/**
 * Create an replace statement; create more complex one with exec yourself.
 *
 * @param {String} table Name of the table
 * @param {Object|Array} data a Object of data to set. Key is the name of the column. Can be an array of objects.
 * @param {undefined|Array} whiteList optional List of columns that only can be updated with "data"
 * @returns {Integer}
 */
DB.prototype.replace = async function (table, data, whiteList) {
  return (await this.run(
    ...createInsertOrReplaceStatement('REPLACE', table, data, whiteList)
  )).lastID
}

/**
 * Create an replace statement; create more complex one with exec yourself.
 *
 * @param {String} table Name of the table
 * @param {Object|Array} data a Object of data to set. Key is the name of the column. Can be an array of objects.
 * @param {undefined|Array} whiteBlackList optional List of columns that can not be updated with "data" (blacklist)
 * @returns {Integer}
 */
DB.prototype.replaceWithBlackList = async function (table, data, blackList) {
  return this.replace(table, data, await createWhiteListByBlackList.bind(this)(table, blackList))
}

async function createWhiteListByBlackList (table, blackList) {
  let whiteList
  if (Array.isArray(blackList)) {
    // get all avaible columns
    whiteList = await this.queryColumn('name', `PRAGMA table_info('${table}')`)
    // get only those not in the whiteBlackList
    whiteList = whiteList.filter(v => !blackList.includes(v))
  }
  return whiteList
}

function createInsertOrReplaceStatement (insertOrReplace, table, data, whiteList) {
  if (!table) {
    throw new Error(`Table is missing for the ${insertOrReplace} command of DB()`)
  }
  if (!Array.isArray(data)) {
    data = [data]
  }

  let fields = Object.keys(data[0])

  if (Array.isArray(whiteList)) {
    fields = fields.filter(v => whiteList.includes(v))
  }

  // Build start of where query
  const parameter = []

  const sql = data.reduce((sql, rowData, index) => {
    fields.forEach(field => parameter.push(rowData[field]))
    return sql + (index ? ',' : '') + '(' + Array.from({ length: fields.length }, () => '?').join(',') + ')'
  }, `${insertOrReplace} INTO \`${table}\` (\`${fields.join('`,`')}\`) VALUES `)
  return [sql, ...parameter]
}

/**
 * Migrates database schema to the latest version
 */
DB.prototype.migrate = async function ({ force, table = 'migrations', migrationsPath = './migrations' } = {}) {
  const exec = (query, ...bindParameters) => new Promise((resolve, reject) => this.db.exec(query, ...bindParameters, err => err ? reject(err) : resolve()))
  const run = (query, ...bindParameters) => new Promise((resolve, reject) => this.db.run(query, ...bindParameters, function (err) { err ? reject(err) : resolve(this) }))
  const query = (query, ...bindParameters) => new Promise((resolve, reject) => this.db.all(query, ...bindParameters, (err, rows) => err ? reject(err) : resolve(rows)))

  const location = path.resolve(appRoot, migrationsPath)

  // Get the list of migration files, for example:
  //   { id: 1, name: 'initial', filename: '001-initial.sql' }
  //   { id: 2, name: 'feature', fielname: '002-feature.sql' }
  const migrations = fs.readdirSync(location).map(x => x.match(/^(\d+).(.*?)\.sql$/))
    .filter(x => x !== null)
    .map(x => ({ id: Number(x[1]), name: x[2], filename: x[0] }))
    .sort((a, b) => Math.sign(a.id - b.id))

  if (!migrations.length) {
    // No migration files found
    return
  }

  // Ge the list of migrations, for example:
  //   { id: 1, name: 'initial', filename: '001-initial.sql', up: ..., down: ... }
  //   { id: 2, name: 'feature', fielname: '002-feature.sql', up: ..., down: ... }
  migrations.map(migration => {
    const filename = path.join(location, migration.filename)
    const data = fs.readFileSync(filename, 'utf-8')
    const [up, down] = data.split(/^--\s+?down\b/mi)
    if (!down) {
      const message = `The ${migration.filename} file does not contain '-- Down' separator.`
      throw new Error(message)
    } else {
      migration.up = up.replace(/^-- .*?$/gm, '').trim()// Remove comments
      migration.down = down.trim() // and trim whitespaces
    }
  })

  // Create a database table for migrations meta data if it doesn't exist
  await exec(`CREATE TABLE IF NOT EXISTS "${table}" (
  id   INTEGER PRIMARY KEY,
  name TEXT    NOT NULL,
  up   TEXT    NOT NULL,
  down TEXT    NOT NULL
)`)

  // Get the list of already applied migrations
  let dbMigrations = await query(
    `SELECT id, name, up, down FROM "${table}" ORDER BY id ASC`
  )

  // Undo migrations that exist only in the database but not in files,
  // also undo the last migration if the `force` option was set to `last`.
  const lastMigration = migrations[migrations.length - 1]
  for (const migration of dbMigrations.slice().sort((a, b) => Math.sign(b.id - a.id))) {
    if (!migrations.some(x => x.id === migration.id) ||
        (force === 'last' && migration.id === lastMigration.id)) {
      await exec('BEGIN')
      try {
        await exec(migration.down)
        await run(`DELETE FROM "${table}" WHERE id = ?`, migration.id)
        await exec('COMMIT')
        dbMigrations = dbMigrations.filter(x => x.id !== migration.id)
      } catch (err) {
        await exec('ROLLBACK')
        throw err
      }
    } else {
      break
    }
  }

  // Apply pending migrations
  const lastMigrationId = dbMigrations.length ? dbMigrations[dbMigrations.length - 1].id : 0
  for (const migration of migrations) {
    if (migration.id > lastMigrationId) {
      await exec('BEGIN')
      try {
        await exec(migration.up)
        await run(
          `INSERT INTO "${table}" (id, name, up, down) VALUES (?, ?, ?, ?)`,
          migration.id, migration.name, migration.up, migration.down
        )
        await exec('COMMIT')
      } catch (err) {
        await exec('ROLLBACK')
        throw err
      }
    }
  }
}

module.exports = DB
