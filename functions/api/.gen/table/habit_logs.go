//
// Code generated by go-jet DO NOT EDIT.
//
// WARNING: Changes to this file may cause incorrect behavior
// and will be lost if the code is regenerated
//

package table

import (
	"github.com/go-jet/jet/v2/sqlite"
)

var HabitLogs = newHabitLogsTable("", "habit_logs", "")

type habitLogsTable struct {
	sqlite.Table

	// Columns
	HabitID sqlite.ColumnInteger
	Day     sqlite.ColumnString
	Count   sqlite.ColumnInteger

	AllColumns     sqlite.ColumnList
	MutableColumns sqlite.ColumnList
	DefaultColumns sqlite.ColumnList
}

type HabitLogsTable struct {
	habitLogsTable

	EXCLUDED habitLogsTable
}

// AS creates new HabitLogsTable with assigned alias
func (a HabitLogsTable) AS(alias string) *HabitLogsTable {
	return newHabitLogsTable(a.SchemaName(), a.TableName(), alias)
}

// Schema creates new HabitLogsTable with assigned schema name
func (a HabitLogsTable) FromSchema(schemaName string) *HabitLogsTable {
	return newHabitLogsTable(schemaName, a.TableName(), a.Alias())
}

// WithPrefix creates new HabitLogsTable with assigned table prefix
func (a HabitLogsTable) WithPrefix(prefix string) *HabitLogsTable {
	return newHabitLogsTable(a.SchemaName(), prefix+a.TableName(), a.TableName())
}

// WithSuffix creates new HabitLogsTable with assigned table suffix
func (a HabitLogsTable) WithSuffix(suffix string) *HabitLogsTable {
	return newHabitLogsTable(a.SchemaName(), a.TableName()+suffix, a.TableName())
}

func newHabitLogsTable(schemaName, tableName, alias string) *HabitLogsTable {
	return &HabitLogsTable{
		habitLogsTable: newHabitLogsTableImpl(schemaName, tableName, alias),
		EXCLUDED:       newHabitLogsTableImpl("", "excluded", ""),
	}
}

func newHabitLogsTableImpl(schemaName, tableName, alias string) habitLogsTable {
	var (
		HabitIDColumn  = sqlite.IntegerColumn("habit_id")
		DayColumn      = sqlite.StringColumn("day")
		CountColumn    = sqlite.IntegerColumn("count")
		allColumns     = sqlite.ColumnList{HabitIDColumn, DayColumn, CountColumn}
		mutableColumns = sqlite.ColumnList{HabitIDColumn, DayColumn, CountColumn}
		defaultColumns = sqlite.ColumnList{CountColumn}
	)

	return habitLogsTable{
		Table: sqlite.NewTable(schemaName, tableName, alias, allColumns...),

		//Columns
		HabitID: HabitIDColumn,
		Day:     DayColumn,
		Count:   CountColumn,

		AllColumns:     allColumns,
		MutableColumns: mutableColumns,
		DefaultColumns: defaultColumns,
	}
}
