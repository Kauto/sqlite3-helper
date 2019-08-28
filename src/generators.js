const DB = require('./database')
const Statement = require('./statement')

/**
 * Similar to .query(), but instead of returning every row together, an iterator is returned so you can retrieve the rows one by one.
 * @see https://github.com/JoshuaWise/better-sqlite3/wiki/API#iteratebindparameters---iterator
 *
 * @param {Object} query the SQL-Query that should be run. Can contain placeholders for bind parameters.
 * @param {any} bindParameters You can specify bind parameters @see https://github.com/JoshuaWise/better-sqlite3/wiki/API#binding-parameters
 * @returns {Iterator}
 */
DB.prototype.queryIterate = async function * (query, ...bindParameters) {
  const statement = await this.prepare(query)
  yield * statement.iterate(...bindParameters)
  await statement.finalize()
}

Statement.prototype.iterate = async function * (...params) {
  const rows = []
  let loop = true
  let resolveCallback = () => {}
  this.orgStatement.each(...params, (err, row) => {
    if (err) {
      throw new Error(err)
    }
    rows.push(row)
    resolveCallback()
  }, () => {
    loop = false
    resolveCallback()
  })
  // eslint-disable-next-line no-unmodified-loop-condition
  while (loop || rows.length) {
    if (!rows.length) {
      await (new Promise(resolve => (resolveCallback = resolve)))
      resolveCallback = () => {}
    }
    if (rows.length) {
      yield rows.shift()
    }
  }
}

module.exports = DB
