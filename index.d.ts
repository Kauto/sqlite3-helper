import * as noGenerators from './no-generators'

export type MigrationOptions = noGenerators.MigrationOptions
export type DBOptions = noGenerators.DBOptions
export type DataObject = noGenerators.DataObject
export type WhereClause = noGenerators.WhereClause

export interface DBInstance extends noGenerators.DBInstance {

    /**
     * Similar to .query(), but instead of returning every row together, an iterator is returned so you can retrieve the rows one by one.
     * @see https://github.com/JoshuaWise/better-sqlite3/wiki/API#iteratebindparameters---iterator
     *
     * @param {Object} query the SQL-Query that should be run. Can contain placeholders for bind parameters.
     * @param {any} bindParameters You can specify bind parameters @see https://github.com/JoshuaWise/better-sqlite3/wiki/API#binding-parameters
     * @returns {Iterator}
     */
    queryIterate<RowData = DataObject>(query: string, ...bindParameters: any[]): Iterable<RowData>

}

export interface Statement extends noGenerators.Statement {
    iterate<RowData = DataObject>(...bindParameters: any[]): Iterable<RowData>
}

export default function DB(options?: DBOptions): DBInstance
