package shop

import (
	"database/sql/driver"
	"fmt"
	"strings"
)

// pgArray is a helper for scanning PostgreSQL TEXT[] columns
type pgArray []string

func (a *pgArray) Scan(src any) error {
	if src == nil {
		*a = []string{}
		return nil
	}
	var s string
	switch v := src.(type) {
	case string:
		s = v
	case []byte:
		s = string(v)
	default:
		return fmt.Errorf("pgArray: unsupported type %T", src)
	}
	// PostgreSQL array literal: {val1,val2,...} or {}
	s = strings.TrimPrefix(s, "{")
	s = strings.TrimSuffix(s, "}")
	if s == "" {
		*a = []string{}
		return nil
	}
	*a = strings.Split(s, ",")
	return nil
}

func (a pgArray) Value() (driver.Value, error) {
	if len(a) == 0 {
		return "{}", nil
	}
	return "{" + strings.Join(a, ",") + "}", nil
}
