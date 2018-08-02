class Statement {
  constructor (orgStatement) {
    this.orgStatement = orgStatement
  }

  bind (...params) {
    return new Promise((resolve, reject) => {
      this.orgStatement.bind(...params, err => {
        err ? reject(err) : resolve(null)
      })
    })
  }

  reset () {
    return new Promise((resolve, reject) => {
      this.orgStatement.reset(err => {
        err ? reject(err) : resolve(null)
      })
    })
  }

  finalize () {
    return new Promise((resolve, reject) => {
      this.orgStatement.finalize(err => {
        err ? reject(err) : resolve(null)
      })
    })
  }

  run (...params) {
    return new Promise((resolve, reject) => {
      this.orgStatement.run(...params, function (err) {
        err ? reject(err) : resolve(this)
      })
    })
  }

  get (...params) {
    return new Promise((resolve, reject) => {
      this.orgStatement.get(...params, (err, row) => {
        err ? reject(err) : resolve(row)
      })
    })
  }

  all (...params) {
    return new Promise((resolve, reject) => {
      this.orgStatement.all(...params, (err, rows) => {
        err ? reject(err) : resolve(rows)
      })
    })
  }

  each (...params) {
    let callback = () => {}
    if (typeof params[params.length - 1] === 'function') {
      callback = params.pop()
    }
    return new Promise((resolve, reject) => {
      this.orgStatement.each(...params, (err, row) => err ? reject(err) : callback(row), (err, count) => {
        err ? reject(err) : resolve(count)
      })
    })
  }

  async * iterate (...params) {
    let rows = []
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
    while (loop) {
      if (!rows.length) {
        await (new Promise(resolve => (resolveCallback = resolve)))
        resolveCallback = () => {}
      }
      if (rows.length) {
        yield rows.shift()
      }
    }
  }
}

module.exports = Statement
