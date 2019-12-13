/* Copyright (C) 2017-2019 Greenbone Networks GmbH
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 */

import React from 'react';

import {connect} from 'react-redux';

import Filter from 'gmp/models/filter';

import {isDefined} from 'gmp/utils/identity';

import Loading from 'web/components/loading/loading';

import SortBy from 'web/components/sortby/sortby';

import ResultsTable from 'web/pages/results/table';

import {
  loadEntities as loadResults,
  selector as resultsSelector,
} from 'web/store/entities/results';

import {pageFilter} from 'web/store/pages/actions';
import getPage from 'web/store/pages/selectors';

import compose from 'web/utils/compose';
import PropTypes from 'web/utils/proptypes';
import withGmp from 'web/utils/withGmp';

import EmptyReport from './emptyreport';
import EmptyResultsReport from './emptyresultsreport';

const filterWithReportId = (filter, reportId) =>
  isDefined(filter)
    ? filter.copy().set('report_id', reportId)
    : Filter.fromString(`report_id=${reportId}`);

class ResultsTab extends React.Component {
  constructor(...args) {
    super(...args);

    this.state = {isUpdating: false};

    this.handleFirstClick = this.handleFirstClick.bind(this);
    this.handleLastClick = this.handleLastClick.bind(this);
    this.handlePreviousClick = this.handlePreviousClick.bind(this);
    this.handleNextClick = this.handleNextClick.bind(this);

    this.handleSortChange = this.handleSortChange.bind(this);
  }

  static getDerivedStateFromProps(props, state) {
    if (isDefined(props.results)) {
      // update only if new results are available to avoid having no results
      // when the filter changes
      return {
        results: props.results,
        resultsCounts: props.resultsCounts,
        isUpdating: false,
      };
    }
    // results are not in the store and are currently loaded
    return {
      isUpdating: true,
    };
  }

  componentDidMount() {
    let filter = this.props.resultsFilter;

    if (!isDefined(filter)) {
      filter = this.props.filter;
    }

    if (isDefined(filter)) {
      this.load(filterWithReportId(filter, this.props.reportId));
    }
  }

  componentDidUpdate(prevProps) {
    const {filter, reportId} = this.props;
    if (isDefined(prevProps.filter) && !prevProps.filter.equals(filter)) {
      const resultsFilter = filterWithReportId(filter, reportId);

      this.load(resultsFilter);
    }
  }

  load(filter) {
    this.setState({isUpdating: true});

    this.props.updateFilter(filter);
    this.props
      .loadResults(filter)
      .then(() => {
        this.setState({isUpdating: false});
      })
      .catch(() => {
        this.setState({isUpdating: false});
      });
  }

  handleFirstClick() {
    const {resultsFilter: filter} = this.props;

    this.load(filter.first());
  }

  handleNextClick() {
    const {resultsFilter: filter} = this.props;

    this.load(filter.next());
  }

  handlePreviousClick() {
    const {resultsFilter: filter} = this.props;

    this.load(filter.previous());
  }

  handleLastClick() {
    const {resultsFilter: filter, resultsCounts: counts} = this.props;

    const last =
      Math.floor((counts.filtered - 1) / counts.rows) * counts.rows + 1;

    this.load(filter.first(last));
  }

  handleSortChange(field) {
    const {resultsFilter: filter} = this.props;

    let sort = 'sort';
    const sortField = filter.getSortBy();

    const newFilter = filter.first();

    if (sortField && sortField === field) {
      sort = newFilter.getSortOrder() === 'sort' ? 'sort-reverse' : 'sort';
    }

    newFilter.set(sort, field);

    this.load(newFilter);
  }

  render() {
    const {isUpdating, results, resultsCounts} = this.state;
    const {
      resultsFilter: filter,
      isLoading = true,
      status,
      progress,
      hasTarget,
      onFilterAddLogLevelClick,
      onFilterDecreaseMinQoDClick,
      onFilterEditClick,
      onFilterRemoveClick,
      onFilterRemoveSeverityClick,
      onTargetEditClick,
    } = this.props;

    const reverseField = isDefined(filter)
      ? filter.get('sort-reverse')
      : undefined;
    const reverse = isDefined(reverseField);
    let sortBy =
      reverse || !isDefined(filter) ? reverseField : filter.get('sort');
    const sortDir = reverse ? SortBy.DESC : SortBy.ASC;

    if (!isDefined(sortBy)) {
      // sort by severity by default
      sortBy = 'severity';
    }

    if (!isDefined(results) && isLoading) {
      return <Loading />;
    }
    if (isDefined(resultsCounts) && resultsCounts.filtered === 0) {
      if (resultsCounts.all === 0) {
        return (
          <EmptyReport
            hasTarget={hasTarget}
            status={status}
            progress={progress}
            onTargetEditClick={onTargetEditClick}
          />
        );
      } else if (resultsCounts.all > 0) {
        return (
          <EmptyResultsReport
            all={resultsCounts.all}
            filter={filter}
            onFilterAddLogLevelClick={onFilterAddLogLevelClick}
            onFilterDecreaseMinQoDClick={onFilterDecreaseMinQoDClick}
            onFilterEditClick={onFilterEditClick}
            onFilterRemoveClick={onFilterRemoveClick}
            onFilterRemoveSeverityClick={onFilterRemoveSeverityClick}
          />
        );
      }
    }
    return (
      <ResultsTable
        delta={false}
        entities={results}
        entitiesCounts={resultsCounts}
        filter={filter}
        footer={false}
        isUpdating={isUpdating}
        links={true}
        sortBy={sortBy}
        sortDir={sortDir}
        toggleDetailsIcon={false}
        onFirstClick={this.handleFirstClick}
        onLastClick={this.handleLastClick}
        onPreviousClick={this.handlePreviousClick}
        onNextClick={this.handleNextClick}
        onSortChange={this.handleSortChange}
      />
    );
  }
}

ResultsTab.propTypes = {
  filter: PropTypes.filter,
  hasTarget: PropTypes.bool,
  isLoading: PropTypes.bool,
  loadResults: PropTypes.func.isRequired,
  progress: PropTypes.number.isRequired,
  reportId: PropTypes.id,
  resultsCounts: PropTypes.counts,
  resultsFilter: PropTypes.filter,
  status: PropTypes.string.isRequired,
  updateFilter: PropTypes.func.isRequired,
  onFilterAddLogLevelClick: PropTypes.func.isRequired,
  onFilterDecreaseMinQoDClick: PropTypes.func.isRequired,
  onFilterEditClick: PropTypes.func.isRequired,
  onFilterRemoveClick: PropTypes.func.isRequired,
  onFilterRemoveSeverityClick: PropTypes.func.isRequired,
  onTargetEditClick: PropTypes.func.isRequired,
};

const getPageName = reportId => `report-${reportId}-results`;

const mapStateToProps = (state, {reportId}) => {
  const name = getPageName(reportId);
  const pSelector = getPage(state);
  const resultsFilter = pSelector.getFilter(name);
  const selector = resultsSelector(state);
  return {
    resultsFilter,
    results: selector.getEntities(resultsFilter),
    resultsCounts: selector.getEntitiesCounts(resultsFilter),
    isLoading: selector.isLoadingEntities(resultsFilter),
  };
};

const mapDispatchToProps = (dispatch, {reportId, gmp}) => {
  const name = getPageName(reportId);
  return {
    loadResults: f => dispatch(loadResults(gmp)(f)),
    updateFilter: f => dispatch(pageFilter(name, f)),
  };
};

export default compose(
  withGmp,
  connect(
    mapStateToProps,
    mapDispatchToProps,
  ),
)(ResultsTab);

// vim: set ts=2 sw=2 tw=80:
