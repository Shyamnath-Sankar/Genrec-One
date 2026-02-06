"""
Cross-database compatible SQLAlchemy types.
Provides JSONB and ARRAY types that work with both PostgreSQL and SQLite.
"""
import json
from sqlalchemy import TypeDecorator, Text, JSON
from sqlalchemy.dialects.postgresql import JSONB as PG_JSONB, ARRAY as PG_ARRAY


class JSONBType(TypeDecorator):
    """
    A JSON type that uses JSONB on PostgreSQL and JSON/Text on SQLite.
    """
    impl = Text
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(PG_JSONB())
        else:
            return dialect.type_descriptor(JSON())

    def process_bind_param(self, value, dialect):
        if value is not None:
            if dialect.name != 'postgresql':
                return json.dumps(value)
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            if dialect.name != 'postgresql' and isinstance(value, str):
                return json.loads(value)
        return value


class ArrayType(TypeDecorator):
    """
    An Array type that uses native ARRAY on PostgreSQL and JSON on SQLite.
    Stores arrays as JSON strings in SQLite.
    """
    impl = Text
    cache_ok = True

    def __init__(self, item_type=None, *args, **kwargs):
        self.item_type = item_type
        super().__init__(*args, **kwargs)

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(PG_ARRAY(self.item_type or Text))
        else:
            return dialect.type_descriptor(JSON())

    def process_bind_param(self, value, dialect):
        if value is not None:
            if dialect.name != 'postgresql':
                return json.dumps(value)
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            if dialect.name != 'postgresql' and isinstance(value, str):
                return json.loads(value)
        return value


# Convenience aliases matching PostgreSQL dialect names
JSONB = JSONBType
ARRAY = ArrayType
