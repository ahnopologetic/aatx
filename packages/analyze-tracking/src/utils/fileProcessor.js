/**
 * @fileoverview File system utilities for recursively reading directories
 * @module analyze-tracking/utils/fileProcessor
 */

const fs = require('fs');
const path = require('path');

// const glob = require('glob');
const { minimatch } = require('minimatch');

/**
 * Recursively collects all files in a directory, excluding those matching ignore glob patterns.
 * @param {string} dirPath - The directory path to search.
 * @param {string[]} ignore - Array of glob patterns to ignore.
 * @param {string[]} arrayOfFiles - Accumulator for found files.
 * @returns {string[]} Array of file paths.
 */
function getAllFiles(dirPath, ignore = [], arrayOfFiles = []) {
  let files;
  try {
    files = fs.readdirSync(dirPath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return arrayOfFiles; // Directory does not exist
    } else {
      throw error;
    }
  }

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);

    // Skip hidden files and directories
    if (file.startsWith('.')) return;

    // Skip common directories we don't want to analyze
    if (
      file === 'node_modules' ||
      file === 'coverage' ||
      file === 'temp' ||
      file === 'tmp' ||
      file === 'log'
    ) {
      return;
    }

    // Check if the file or directory matches any ignore pattern
    const shouldIgnore = ignore.some((pattern) =>
      minimatch(fullPath, pattern, { dot: true, matchBase: true })
    );
    if (shouldIgnore) return;

    let stats;
    try {
      stats = fs.statSync(fullPath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return; // Skip this file or directory if it does not exist
      } else {
        throw error;
      }
    }

    if (stats.isDirectory()) {
      getAllFiles(fullPath, ignore, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

module.exports = { getAllFiles };
