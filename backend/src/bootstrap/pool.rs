use diesel::pg::PgConnection;
use diesel::r2d2::{ConnectionManager, Pool, PooledConnection};
use std::time::Duration;

pub type DbPool = Pool<ConnectionManager<PgConnection>>;
pub type DbConn = PooledConnection<ConnectionManager<PgConnection>>;

pub fn init(url: &str) -> DbPool {
    let manager = ConnectionManager::<PgConnection>::new(url);
    Pool::builder()
        .max_size(10)
        .min_idle(Some(2))
        .connection_timeout(Duration::from_secs(5))
        .build(manager)
        .expect("Failed to create pool")
}
