-- LOGOS ECOSYSTEM - DATABASE PERFORMANCE OPTIMIZATIONS
-- Execute these queries to optimize database performance

-- 1. Create indexes for faster queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at ON users (created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active ON users (is_active) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_user_id ON products (user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_status ON products (status) WHERE status = 'active';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_created_at ON products (created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_user_id ON subscriptions (user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_status ON subscriptions (status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_expires_at ON subscriptions (expires_at) WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_user_id ON invoices (user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_status ON invoices (status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_created_at ON invoices (created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_user_status ON invoices (user_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tickets_user_id ON support_tickets (user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tickets_status_priority ON support_tickets (status, priority);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tickets_assigned_to ON support_tickets (assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tickets_created_at ON support_tickets (created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);

-- 2. Create composite indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_user_status ON products (user_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_user_status ON subscriptions (user_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tickets_user_status ON support_tickets (user_id, status);

-- 3. Create partial indexes for filtered queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_unpaid ON invoices (user_id, created_at) WHERE status = 'unpaid';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_expiring ON subscriptions (expires_at) WHERE status = 'active' AND expires_at < NOW() + INTERVAL '7 days';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tickets_open_priority ON support_tickets (priority, created_at) WHERE status IN ('open', 'in_progress');

-- 4. Create function indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_full_name ON users (LOWER(first_name || ' ' || last_name));

-- 5. Optimize table statistics
ANALYZE users;
ANALYZE products;
ANALYZE subscriptions;
ANALYZE invoices;
ANALYZE support_tickets;
ANALYZE audit_logs;

-- 6. Create materialized views for complex queries
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_user_statistics AS
SELECT 
    u.id as user_id,
    u.email,
    COUNT(DISTINCT p.id) as total_products,
    COUNT(DISTINCT s.id) as total_subscriptions,
    COUNT(DISTINCT i.id) as total_invoices,
    SUM(CASE WHEN i.status = 'paid' THEN i.amount ELSE 0 END) as total_revenue,
    COUNT(DISTINCT t.id) as total_tickets,
    MAX(u.last_login) as last_login,
    u.created_at
FROM users u
LEFT JOIN products p ON u.id = p.user_id
LEFT JOIN subscriptions s ON u.id = s.user_id
LEFT JOIN invoices i ON u.id = i.user_id
LEFT JOIN support_tickets t ON u.id = t.user_id
GROUP BY u.id, u.email, u.created_at;

CREATE UNIQUE INDEX ON mv_user_statistics (user_id);

-- 7. Create refresh function for materialized view
CREATE OR REPLACE FUNCTION refresh_user_statistics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_statistics;
END;
$$ LANGUAGE plpgsql;

-- 8. Performance monitoring views
CREATE OR REPLACE VIEW v_slow_queries AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    stddev_time,
    rows
FROM pg_stat_statements
WHERE mean_time > 100 -- queries taking more than 100ms
ORDER BY mean_time DESC
LIMIT 50;

-- 9. Table partitioning for large tables (audit_logs)
-- Create partitioned table for audit logs by month
CREATE TABLE IF NOT EXISTS audit_logs_partitioned (
    LIKE audit_logs INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Create partitions for the next 12 months
DO $$
DECLARE
    start_date date;
    end_date date;
    partition_name text;
BEGIN
    FOR i IN 0..11 LOOP
        start_date := date_trunc('month', CURRENT_DATE + (i || ' months')::interval);
        end_date := date_trunc('month', CURRENT_DATE + ((i + 1) || ' months')::interval);
        partition_name := 'audit_logs_' || to_char(start_date, 'YYYY_MM');
        
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS %I PARTITION OF audit_logs_partitioned
            FOR VALUES FROM (%L) TO (%L);
        ', partition_name, start_date, end_date);
    END LOOP;
END $$;

-- 10. Connection pooling configuration
-- Add to postgresql.conf:
-- max_connections = 200
-- shared_buffers = 2GB
-- effective_cache_size = 6GB
-- maintenance_work_mem = 512MB
-- checkpoint_completion_target = 0.9
-- wal_buffers = 16MB
-- default_statistics_target = 100
-- random_page_cost = 1.1
-- effective_io_concurrency = 200
-- work_mem = 10MB
-- min_wal_size = 1GB
-- max_wal_size = 4GB

-- 11. Create performance monitoring function
CREATE OR REPLACE FUNCTION get_table_sizes()
RETURNS TABLE (
    table_name text,
    total_size text,
    table_size text,
    indexes_size text,
    toast_size text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname||'.'||tablename AS table_name,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
        pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
        pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) AS indexes_size,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename) - pg_indexes_size(schemaname||'.'||tablename)) AS toast_size
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
END;
$$ LANGUAGE plpgsql;

-- 12. Vacuum and reindex commands (run periodically)
-- VACUUM ANALYZE;
-- REINDEX DATABASE logos_production;