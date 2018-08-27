declare module 'sqlite3-helper' {

    import sqlite3 = require('sqlite3')

    type MigrationOptions = {
        /** Whether to set to 'last' to automatically reapply the last migration-file. Default: false */
        force?: 'last' | false
        /** The name of the database table that is used to keep track. Default: 'migration' */
        table?: string
        /** The path of the migration files. Default: './migrations' */
        migrationsPath?: string
    }

    type DBOptions = {
        /** Path to sqlite database file. Default: './data/sqlite3.db' */
        path?: string
        /** Whether to create a db only in memory. Default: false */
        memory?: boolean
        /** Whether to open database readonly. Default: false */
        readonly?: boolean
        /** Whether to throw error if database not exists. Default: false */
        fileMustExist?: boolean
        /** Whether to automatically enable 'PRAGMA journal_mode = WAL'. Default: true */
        WAL?: boolean
        /** Migration options. Disable completely by setting `migrate: false` */
        migrate?: MigrationOptions | false
    }

    type DataObject = { [key:string]: any }

    /**
     * Specifies a where clause.
     * 
     *   - Either a string containing the value to use as ID that will be translated to ['id = ?', id]
     *   - Or an array with a string and the replacements for ? after that. F.e. ['id > ? && name = ?', id, name].
     *   - Or an object with key values. F.e. {id: params.id}. Or simply an ID that will be translated to ['id = ?', id]
     */
    type WhereClause = string | any[] | DataObject

    interface DBInstance {
        connection(): Promise<sqlite3.Database>

        prepare(sql: string, ...params: any[]): Promise<Statement>

        exec(sql: string): Promise<void>

        //DB.prototype.pragma = function (source, simplify = false) {

        //DB.prototype.checkpoint = function (databaseName) {

        //DB.prototype.register = function (...args) {

        close(): Promise<void>

        //DB.prototype.defaultSafeIntegers = function (toggleState) {

        /**
         * Executes the prepared statement. When execution completes it returns an info object describing any changes made. The info object has two properties:
         *
         * info.changes: The total number of rows that were inserted, updated, or deleted by this operation. Changes made by foreign key actions or trigger programs do not count.
         * info.lastInsertROWID: The rowid of the last row inserted into the database (ignoring those caused by trigger programs). If the current statement did not insert any rows into the database, this number should be completely ignored.
         *
         * If execution of the statement fails, an Error is thrown.
         * @see https://github.com/JoshuaWise/better-sqlite3/wiki/API#runbindparameters---object
         *
         * @param {Object} query the SQL-Query that should be run. Can contain placeholders for bind parameters.
         * @param {any} bindParameters You can specify bind parameters @see https://github.com/JoshuaWise/better-sqlite3/wiki/API#binding-parameters
         * @returns {object}
         */
        run(query: string, ...bindParameters: any[]): Promise<sqlite3.RunResult>

        /**
         * Returns all values of a query
         * @see https://github.com/JoshuaWise/better-sqlite3/wiki/API#allbindparameters---array-of-rows
         *
         * @param {Object} query the SQL-Query that should be run. Can contain placeholders for bind parameters.
         * @param {any} bindParameters You can specify bind parameters @see https://github.com/JoshuaWise/better-sqlite3/wiki/API#binding-parameters
         * @returns {array}
         */
        query<RowData = DataObject>(query: string, ...bindParameters: any[]): Promise<RowData[]>

        /**
         * Similar to .query(), but instead of returning every row together, an iterator is returned so you can retrieve the rows one by one.
         * @see https://github.com/JoshuaWise/better-sqlite3/wiki/API#iteratebindparameters---iterator
         *
         * @param {Object} query the SQL-Query that should be run. Can contain placeholders for bind parameters.
         * @param {any} bindParameters You can specify bind parameters @see https://github.com/JoshuaWise/better-sqlite3/wiki/API#binding-parameters
         * @returns {Iterator}
         */
        queryIterate<RowData = DataObject>(query: string, ...bindParameters: any[]): Iterable<RowData>

        /**
         * Returns the values of the first row of the query-result
         * @see https://github.com/JoshuaWise/better-sqlite3/wiki/API#getbindparameters---row
         *
         * @param {Object} query the SQL-Query that should be run. Can contain placeholders for bind parameters.
         * @param {any} bindParameters You can specify bind parameters @see https://github.com/JoshuaWise/better-sqlite3/wiki/API#binding-parameters
         * @returns {Object|null}
         */
        queryFirstRow<RowData = DataObject>(query: string, ...bindParameters: any[]): Promise<RowData|null>

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
        queryFirstRowObject<RowData = DataObject>(query: string, ...bindParameters: any[]): Promise<RowData|{}>

        /**
         * Returns the value of the first column in the first row of the query-result
         *
         * @param {Object} query the SQL-Query that should be run. Can contain placeholders for bind parameters.
         * @param {any} bindParameters You can specify bind parameters @see https://github.com/JoshuaWise/better-sqlite3/wiki/API#binding-parameters
         * @returns {any}
         */
        queryFirstCell<CellType = any>(query: string, ...bindParameters: any[]): Promise<CellType|undefined>

        /**
         * Calls a callback for every row
         *
         * @param {Object} query the SQL-Query that should be run. Can contain placeholders for bind parameters.
         * @param {any} bindParameters You can specify bind parameters @see https://github.com/JoshuaWise/better-sqlite3/wiki/API#binding-parameters
         * @param {any} callback the callback that is called
         * @returns {integer} count
         */
        each<RowData = DataObject>(query: string, p1: any, callback: (row: RowData) => void): Promise<number>
        each<RowData = DataObject>(query: string, p1: any, p2: any, callback: (row: RowData) => void): Promise<number>
        each<RowData = DataObject>(query: string, p1: any, p2: any, p3: any, callback: (row: RowData) => void): Promise<number>
        each<RowData = DataObject>(query: string, p1: any, p2: any, p3: any, p4: any, callback: (row: RowData) => void): Promise<number>
        each<RowData = DataObject>(query: string, p1: any, p2: any, p3: any, p4: any, p5: any, callback: (row: RowData) => void): Promise<number>
        each<RowData = DataObject>(query: string, p1: any, p2: any, p3: any, p4: any, p5: any, p6: any, callback: (row: RowData) => void): Promise<number>
        each<RowData = DataObject>(query: string, p1: any, p2: any, p3: any, p4: any, p5: any, p6: any, p7: any, callback: (row: RowData) => void): Promise<number>
        each<RowData = DataObject>(query: string, p1: any, p2: any, p3: any, p4: any, p5: any, p6: any, p7: any, p8: any, callback: (row: RowData) => void): Promise<number>
        each<RowData = DataObject>(query: string, p1: any, p2: any, p3: any, p4: any, p5: any, p6: any, p7: any, p8: any, p9: any, callback: (row: RowData) => void): Promise<number>
        each<RowData = DataObject>(query: string, p1: any, p2: any, p3: any, p4: any, p5: any, p6: any, p7: any, p8: any, p9: any, p10: any, callback: (row: RowData) => void): Promise<number>
        each<RowData = DataObject>(query: string, ...bindParameters: any[]): Promise<number>

        /**
         * Returns an Array that only contains the values of the specified column
         *
         * @param {Object} column Name of the column
         * @param {Object} query the SQL-Query that should be run. Can contain placeholders for bind parameters.
         * @param {any} bindParameters You can specify bind parameters @see https://github.com/JoshuaWise/better-sqlite3/wiki/API#binding-parameters
         * @returns {array}
         */
        queryColumn<ColumnType = any>(column: string, query: string, ...bindParameters: any[]): Promise<ColumnType[]>

        /**
         * Returns a Object that get it key-value-combination from the result of the query
         *
         * @param {String} key Name of the column that values should be the key
         * @param {Object} column Name of the column that values should be the value for the object
         * @param {Object} query the SQL-Query that should be run. Can contain placeholders for bind parameters.
         * @param {any} bindParameters You can specify bind parameters @see https://github.com/JoshuaWise/better-sqlite3/wiki/API#binding-parameters
         * @returns {object}
         */
        queryKeyAndColumn<ValueColumnType = any>(key: string, column: string, query: string, ...bindParameters: any[]): Promise<{[key:string]: ValueColumnType}>

        /**
         * Create an update statement; create more complex one with exec yourself.
         *
         * @param {String} table Name of the table
         * @param {Object} data a Object of data to set. Key is the name of the column. Value 'undefined' is filtered
         * @param {String|Array|Object} where required. array with a string and the replacements for ? after that. F.e. ['id > ? && name = ?', id, name]. Or an object with key values. F.e. {id: params.id}. Or simply an ID that will be translated to ['id = ?', id]
         * @param {undefined|Array} whiteList optional List of columns that can only be updated with "data"
         * @returns {Integer} The number of updated rows
         */
        update<RowData = DataObject>(table: string, data: Partial<RowData>, where: WhereClause, whiteList?: string[]): Promise<number>

        /**
         * Create an update statement; create more complex one with exec yourself.
         *
         * @param {String} table Name of the table
         * @param {Object} data a Object of data to set. Key is the name of the column. Value 'undefined' is filtered
         * @param {String|Array|Object} where required. array with a string and the replacements for ? after that. F.e. ['id > ? && name = ?', id, name]. Or an object with key values. F.e. {id: params.id}. Or simply an ID that will be translated to ['id = ?', id]
         * @param {undefined|Array} whiteBlackList optional List of columns that can not be updated with "data" (blacklist)
         * @returns {Integer} The number of updated rows
         */
        updateWithBlackList(table: string, data: DataObject, where: WhereClause, blackList?: string[]): Promise<number>

        /**
         * Create an insert statement; create more complex one with exec yourself.
         *
         * @param {String} table Name of the table
         * @param {Object|Array} data a Object of data to set. Key is the name of the column. Can be an array of objects.
         * @param {undefined|Array} whiteList optional List of columns that only can be updated with "data"
         * @returns {Integer} The number of inserted rows
         */
        insert(table: string, data: DataObject | DataObject[], whiteList?: string[]): Promise<number>

        /**
         * Create an insert statement; create more complex one with exec yourself.
         *
         * @param {String} table Name of the table
         * @param {Object|Array} data a Object of data to set. Key is the name of the column. Can be an array of objects.
         * @param {undefined|Array} whiteBlackList optional List of columns that can not be updated with "data" (blacklist)
         * @returns {Integer} The number of inserted rows
         */
        insertWithBlackList(table: string, data: DataObject | DataObject[], blackList?: string[]): Promise<number>

        /**
         * Create an replace statement; create more complex one with exec yourself.
         *
         * @param {String} table Name of the table
         * @param {Object|Array} data a Object of data to set. Key is the name of the column. Can be an array of objects.
         * @param {undefined|Array} whiteList optional List of columns that only can be updated with "data"
         * @returns {Integer} The number of changed rows
         */
        replace(table: string, data: DataObject | DataObject[], whiteList?: string[]): Promise<number>

        /**
         * Create an replace statement; create more complex one with exec yourself.
         *
         * @param {String} table Name of the table
         * @param {Object|Array} data a Object of data to set. Key is the name of the column. Can be an array of objects.
         * @param {undefined|Array} whiteBlackList optional List of columns that can not be updated with "data" (blacklist)
         * @returns {Integer} The number of changed rows
         */
        replaceWithBlackList(table: string, data: DataObject | DataObject[], blackList?: string[]): Promise<number>

        /**
         * Migrates database schema to the latest version
         */
        migrate(options?: MigrationOptions): Promise<void>
    }

    interface Statement {
        bind(...params: any[]): Promise<void>

        reset(): Promise<void>

        finalize(): Promise<void>

        run(...params: any[]): Promise<sqlite3.RunResult>

        get<RowData = DataObject>(...params: any[]): Promise<RowData | undefined>

        all<RowData = DataObject>(...params: any[]): Promise<RowData[]>

        each<RowData = DataObject>(p1: any, callback: (row: RowData) => void): Promise<number>
        each<RowData = DataObject>(p1: any, p2: any, callback: (row: RowData) => void): Promise<number>
        each<RowData = DataObject>(p1: any, p2: any, p3: any, callback: (row: RowData) => void): Promise<number>
        each<RowData = DataObject>(p1: any, p2: any, p3: any, p4: any, callback: (row: RowData) => void): Promise<number>
        each<RowData = DataObject>(p1: any, p2: any, p3: any, p4: any, p5: any, callback: (row: RowData) => void): Promise<number>
        each<RowData = DataObject>(p1: any, p2: any, p3: any, p4: any, p5: any, p6: any, callback: (row: RowData) => void): Promise<number>
        each<RowData = DataObject>(p1: any, p2: any, p3: any, p4: any, p5: any, p6: any, p7: any, callback: (row: RowData) => void): Promise<number>
        each<RowData = DataObject>(p1: any, p2: any, p3: any, p4: any, p5: any, p6: any, p7: any, p8: any, callback: (row: RowData) => void): Promise<number>
        each<RowData = DataObject>(p1: any, p2: any, p3: any, p4: any, p5: any, p6: any, p7: any, p8: any, p9: any, callback: (row: RowData) => void): Promise<number>
        each<RowData = DataObject>(p1: any, p2: any, p3: any, p4: any, p5: any, p6: any, p7: any, p8: any, p9: any, p10: any, callback: (row: RowData) => void): Promise<number>
        each<RowData = DataObject>(...bindParameters: any[]): Promise<number>
    }

}

export default function DB(options?: DBOptions): DBInstance
