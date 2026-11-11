//! Domain logic and database access for kintsugi.
//!
//! This crate must never depend on Tauri, so a server can reuse it later.

pub mod db;
pub mod error;
pub mod tracker;

pub use db::{Health, Pool, health, open, open_in_memory};
pub use error::{Error, Result};
