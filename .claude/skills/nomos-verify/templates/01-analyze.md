# Analysis Results: {timestamp}

## Compact Context -> Step 02

- **Dimensions Analyzed:** {dimensions_count} ({dimension_names})
- **Total Findings:** {total_findings}
- **Critical:** {critical_count} | **High:** {high_count} | **Medium:** {medium_count} | **Low:** {low_count}
- **Agents Completed:** {agents_completed}/{agents_expected}
- **Features with Issues:** {features_with_issues}
- **Regressions Detected:** {regression_count}

---

## Analysis Configuration

| Setting | Value |
|---------|-------|
| **Analysis Mode** | {analysis_mode} |
| **Depth** | {depth} |
| **Dimensions** | {dimension_names} |

## Agent Results

### Dimension: Bugs (code-reviewer)

{bugs_findings}

### Dimension: Quality (scout)

{quality_findings}

### Dimension: Requirements (qa-reviewer)

{requirements_findings}

### Dimension: Security (security-reviewer)

{security_findings}

### Dimension: Testing (code-reviewer)

{testing_findings}

---

## Raw Findings Summary

| Dimension | Findings | Critical | High | Medium | Low |
|-----------|----------|----------|------|--------|-----|
| Bugs | {bugs_total} | {bugs_critical} | {bugs_high} | {bugs_medium} | {bugs_low} |
| Quality | {quality_total} | {quality_critical} | {quality_high} | {quality_medium} | {quality_low} |
| Requirements | {req_total} | {req_critical} | {req_high} | {req_medium} | {req_low} |
| Security | {sec_total} | {sec_critical} | {sec_high} | {sec_medium} | {sec_low} |
| Testing | {test_total} | {test_critical} | {test_high} | {test_medium} | {test_low} |
| **Total** | **{total_findings}** | **{critical_count}** | **{high_count}** | **{medium_count}** | **{low_count}** |

---

*Analysis completed at {analysis_timestamp}*
