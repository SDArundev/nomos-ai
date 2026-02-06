# Refactor Type Guide

Type-specific strategies, agent configurations, and expected outputs for each refactor type.

---

## Type Matrix

| Type | Agents | Risk | Requires Replacement | Output Files |
|------|--------|------|---------------------|--------------|
| `dependency` | explore-codebase, code-architect, code-writer, security-reviewer | MEDIUM | Yes | analysis, plan, diff-summary |
| `move` | explore-codebase, code-writer | LOW-MEDIUM | Yes | analysis, plan, diff-summary |
| `rename` | explore-codebase, code-writer | LOW | Yes | analysis, plan, diff-summary |
| `optimize` | explore-codebase, code-architect, code-writer | MEDIUM-HIGH | No | analysis, plan, diff-summary |
| `extract` | explore-codebase, code-architect, code-writer | MEDIUM | Yes (module name) | analysis, plan, diff-summary |
| `inline` | explore-codebase, code-writer | LOW | No | analysis, plan, diff-summary |
| `modernize` | explore-codebase, code-architect, code-writer | MEDIUM | Yes | analysis, plan, diff-summary, migration-guide |
| `structure` | explore-codebase, code-architect, code-writer, qa-smoke-tester | HIGH | Yes | analysis, plan, diff-summary, migration-guide |

---

## Dependency Replacement

**When:** Swapping one npm/bun package for another (e.g., `lodash` -> `es-toolkit`).

**Analysis focus:**
1. Which exports are actually used (functions, types, constants)
2. API compatibility between old and new package
3. Version-specific features or breaking changes
4. Type definition differences (`@types/*` vs bundled)

**Execution order:**
1. Install new package
2. Create API compatibility shim (if needed)
3. Update imports file-by-file (alphabetical for predictability)
4. Handle API differences per-function
5. Update type imports
6. Remove old package
7. Validate

**Security:** Always run security-reviewer for dependency changes — supply chain risk.

**Gotchas:**
- Peer dependencies may conflict
- Bundle size may increase/decrease significantly
- Some APIs have subtle behavior differences (e.g., `_.get()` default handling)

---

## Move / Restructure

**When:** Moving files/directories to a new location (e.g., `src/utils` -> `packages/shared`).

**Analysis focus:**
1. All importers of the target files
2. Internal dependencies within the target directory
3. tsconfig.json path aliases that reference the target
4. Package.json changes (if creating a new package)

**Execution order:**
1. Create destination directory structure
2. Move files (git mv for history preservation)
3. Update internal imports within moved files
4. Update all external importers
5. Update tsconfig paths
6. Update package.json if needed
7. Validate

**Gotchas:**
- Circular dependencies can emerge when restructuring
- tsconfig paths must update before type-checking works
- Turborepo package boundaries may need reconfiguration

---

## Rename Symbol

**When:** Renaming a class, function, variable, type, or interface across the codebase.

**Analysis focus:**
1. Symbol definition location
2. All code references (imports, usage, re-exports)
3. Type references
4. String literals containing the name (API routes, error messages)
5. Test file references
6. Documentation/comments

**Execution order:**
1. Rename definition
2. Update all code references
3. Update type references
4. Update string literals (if applicable)
5. Update tests
6. Update documentation
7. Validate

**Gotchas:**
- String literals won't be caught by IDE rename
- Dynamic access (`obj[name]`) won't be caught
- Generated files (routeTree.gen.ts) may need regeneration

---

## Performance Optimization

**When:** Optimizing a specific path or module for better performance.

**Analysis focus:**
1. Current performance metrics (build time, bundle size, runtime)
2. Profiling data or bottleneck identification
3. Optimization opportunities (lazy loading, tree shaking, memoization)
4. Risk of behavior changes

**Execution order:**
1. Capture baseline metrics
2. Implement optimizations one at a time
3. Measure after each change
4. Validate no behavior regression
5. Compare final metrics to baseline

**Gotchas:**
- Premature optimization — measure first
- Memoization can increase memory usage
- Tree shaking requires ESM exports

---

## Extract Module

**When:** Extracting code from a large file into a separate module or package.

**Analysis focus:**
1. Which symbols to extract (functions, types, constants)
2. Dependencies of extracted code
3. Consumers of extracted code
4. Interface boundary (what's public vs internal)

**Execution order:**
1. Create new module file/directory
2. Move extracted symbols
3. Add re-exports from original location (temporary compatibility)
4. Update direct consumers to use new location
5. Remove re-exports
6. Validate

---

## Inline Abstraction

**When:** Removing an unnecessary abstraction layer by inlining its code.

**Analysis focus:**
1. All consumers of the abstraction
2. Whether inlining introduces duplication
3. Whether the abstraction provides any value (caching, error handling)

**Execution order:**
1. Identify all call sites
2. Replace each call with inlined code
3. Remove the abstraction
4. Validate no dead code remains

---

## Modernize Patterns

**When:** Updating code from old patterns to modern equivalents (e.g., callbacks -> async/await).

**Analysis focus:**
1. All instances of the old pattern
2. API compatibility of the modern pattern
3. Error handling differences
4. Test coverage of affected code

**Execution order:**
1. Update pattern instances one module at a time
2. Run tests after each module
3. Handle error propagation changes
4. Update types if needed
5. Validate

**Gotchas:**
- async/await changes error propagation behavior
- Promise.all vs sequential execution semantics differ
- Some callback APIs don't have async equivalents

---

## Structure Change

**When:** Major reorganization of project structure (e.g., monolith -> packages).

**Analysis focus:**
1. Current module dependency graph
2. Target structure and package boundaries
3. Shared code identification
4. Build system changes needed
5. CI/CD impact

**Execution order:**
1. Create target directory structure
2. Move shared code to packages first
3. Move application code
4. Update all import paths
5. Configure build system
6. Update CI/CD
7. Full validation suite

**Risk:** HIGH — always requires manual review and approval.
