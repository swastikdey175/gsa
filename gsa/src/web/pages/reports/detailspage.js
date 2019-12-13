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

import 'core-js/fn/string/includes';

import React from 'react';

import {connect} from 'react-redux';

import _ from 'gmp/locale';

import logger from 'gmp/log';

import Filter, {RESET_FILTER, RESULTS_FILTER_FILTER} from 'gmp/models/filter';
import {isActive} from 'gmp/models/task';

import {first} from 'gmp/utils/array';
import {isDefined, hasValue} from 'gmp/utils/identity';

import withDownload from 'web/components/form/withDownload';

import Reload, {
  NO_RELOAD,
  USE_DEFAULT_RELOAD_INTERVAL_ACTIVE,
} from 'web/components/loading/reload';

import withDialogNotification from 'web/components/notification/withDialogNotifiaction'; // eslint-disable-line max-len

import withDefaultFilter from 'web/entities/withDefaultFilter';

import DownloadReportDialog from 'web/pages/reports/downloadreportdialog';

import {
  loadAllEntities as loadFilters,
  selector as filterSelector,
} from 'web/store/entities/filters';

import {
  loadAllEntities as loadReportFormats,
  selector as reportFormatsSelector,
} from 'web/store/entities/reportformats';

import {
  selector as reportSelector,
  loadEntityWithThreshold,
} from 'web/store/entities/reports';

import {
  loadReportComposerDefaults,
  renewSessionTimeout,
  saveReportComposerDefaults,
} from 'web/store/usersettings/actions';

import {loadUserSettingDefaults} from 'web/store/usersettings/defaults/actions';
import {getUserSettingsDefaults} from 'web/store/usersettings/defaults/selectors';
import {loadUserSettingsDefaultFilter} from 'web/store/usersettings/defaultfilters/actions';
import {getUserSettingsDefaultFilter} from 'web/store/usersettings/defaultfilters/selectors';

import {
  getReportComposerDefaults,
  getUsername,
} from 'web/store/usersettings/selectors';

import {create_pem_certificate} from 'web/utils/cert';
import compose from 'web/utils/compose';
import {generateFilename} from 'web/utils/render';
import PropTypes from 'web/utils/proptypes';
import withGmp from 'web/utils/withGmp';

import TargetComponent from '../targets/component';

import Page from './detailscontent';
import FilterDialog from './detailsfilterdialog';
import {pageFilter as setPageFilter} from 'web/store/pages/actions';
import getPage from 'web/store/pages/selectors';

const log = logger.getLogger('web.pages.report.detailspage');

const DEFAULT_FILTER = Filter.fromString(
  'levels=hml rows=100 min_qod=70 first=1 sort-reverse=severity',
);

const REPORT_FORMATS_FILTER = Filter.fromString('active=1 and trust=1 rows=-1');

const getTarget = (entity = {}) => {
  const {report = {}} = entity;
  const {task = {}} = report;
  return task.target;
};

const getFilter = (entity = {}) => {
  const {report = {}} = entity;
  return report.filter;
};

class ReportDetails extends React.Component {
  constructor(...args) {
    super(...args);

    this.state = {
      activeTab: 0,
      showFilterDialog: false,
      showDownloadReportDialog: false,
      sorting: {
        results: {
          sortField: 'severity',
          sortReverse: true,
        },
        apps: {
          sortField: 'severity',
          sortReverse: true,
        },
        ports: {
          sortField: 'severity',
          sortReverse: true,
        },
        hosts: {
          sortField: 'severity',
          sortReverse: true,
        },
        os: {
          sortField: 'severity',
          sortReverse: true,
        },
        cves: {
          sortField: 'severity',
          sortReverse: true,
        },
        closedcves: {
          sortField: 'severity',
          sortReverse: true,
        },
        tlscerts: {
          sortField: 'dn',
          sortReverse: false,
        },
        errors: {
          sortField: 'error',
          sortReverse: false,
        },
      },
    };

    this.handleActivateTab = this.handleActivateTab.bind(this);
    this.handleAddToAssets = this.handleAddToAssets.bind(this);
    this.handleChanged = this.handleChanged.bind(this);
    this.handleError = this.handleError.bind(this);
    this.handleFilterAddLogLevel = this.handleFilterAddLogLevel.bind(this);
    this.handleFilterChange = this.handleFilterChange.bind(this);
    this.handleFilterDecreaseMinQoD = this.handleFilterDecreaseMinQoD.bind(
      this,
    );
    this.handleFilterCreated = this.handleFilterCreated.bind(this);
    this.handleFilterEditClick = this.handleFilterEditClick.bind(this);
    this.handleFilterRemoveSeverity = this.handleFilterRemoveSeverity.bind(
      this,
    );
    this.handleFilterRemoveClick = this.handleFilterRemoveClick.bind(this);
    this.handleFilterResetClick = this.handleFilterResetClick.bind(this);
    this.handleRemoveFromAssets = this.handleRemoveFromAssets.bind(this);
    this.handleReportDownload = this.handleReportDownload.bind(this);
    this.handleTlsCertificateDownload = this.handleTlsCertificateDownload.bind(
      this,
    );
    this.handleFilterDialogClose = this.handleFilterDialogClose.bind(this);
    this.handleSortChange = this.handleSortChange.bind(this);

    this.loadTarget = this.loadTarget.bind(this);
    this.handleOpenDownloadReportDialog = this.handleOpenDownloadReportDialog.bind(
      this,
    );
    this.handleCloseDownloadReportDialog = this.handleCloseDownloadReportDialog.bind(
      this,
    );
  }

  componentDidMount() {
    this.props.loadSettings();
    this.props.loadFilters();
    this.props.loadReportFormats();
    this.props.loadReportComposerDefaults();
  }

  componentDidUpdate(prevProps) {
    const {reportFormats} = this.props;
    if (
      !isDefined(this.state.reportFormatId) &&
      isDefined(reportFormats) &&
      reportFormats.length > 0
    ) {
      // set initial report format id if available
      const reportFormatId = first(reportFormats).id;
      if (isDefined(reportFormatId)) {
        // ensure the report format id is only set if we really have one
        // if no report format id is available we would create an infinite
        // render loop here
        this.setState({reportFormatId});
      }
    }

    if (prevProps.reportId !== this.props.reportId) {
      this.load();
    }
  }

  load(filter) {
    log.debug('Loading report', {
      filter,
    });
    const {reportFilter} = this.props;

    this.setState({
      isUpdating: isDefined(reportFilter) || !reportFilter.equals(filter), // show update indicator if filter has changed
    });

    this.props
      .reload(filter)
      .then(() => {
        this.setState({isUpdating: false});
      })
      .catch(() => {
        this.setState({isUpdating: false});
      });
  }

  reload() {
    // reload data from backend
    this.load(this.props.reportFilter);
  }

  handleChanged() {
    this.reload();
  }

  handleError(error) {
    const {showError} = this.props;
    log.error(error);
    showError(error);
  }

  handleFilterChange(filter) {
    this.handleInteraction();

    this.load(filter);
  }

  handleFilterRemoveClick() {
    this.handleFilterChange(RESET_FILTER);
  }

  handleFilterResetClick() {
    this.handleFilterChange(this.props.resultDefaultFilter);
  }

  handleActivateTab(index) {
    this.handleInteraction();

    this.setState({activeTab: index});
  }

  handleAddToAssets() {
    const {gmp, showSuccessMessage, entity, reportFilter: filter} = this.props;

    this.handleInteraction();

    gmp.report.addAssets(entity, {filter}).then(() => {
      showSuccessMessage(
        _(
          'Report content added to Assets with QoD>=70% and Overrides enabled.',
        ),
      );
      this.reload();
    }, this.handleError);
  }

  handleRemoveFromAssets() {
    const {gmp, showSuccessMessage, entity, reportFilter: filter} = this.props;

    this.handleInteraction();

    gmp.report.removeAssets(entity, {filter}).then(() => {
      showSuccessMessage(_('Report content removed from Assets.'));
      this.reload();
    }, this.handleError);
  }

  handleFilterEditClick() {
    this.handleInteraction();

    this.setState({showFilterDialog: true});
  }

  handleFilterDialogClose() {
    this.handleInteraction();

    this.setState({showFilterDialog: false});
  }

  handleOpenDownloadReportDialog() {
    this.setState({
      showDownloadReportDialog: true,
    });
  }

  handleCloseDownloadReportDialog() {
    this.setState({showDownloadReportDialog: false});
  }

  handleReportDownload(state) {
    const {
      entity,
      gmp,
      reportComposerDefaults,
      reportExportFileName,
      reportFilter,
      reportFormats = [],
      username,
      onDownload,
    } = this.props;
    const {
      includeNotes,
      includeOverrides,
      reportFormatId,
      storeAsDefault,
    } = state;

    const newFilter = reportFilter.copy();
    newFilter.set('notes', includeNotes);
    newFilter.set('overrides', includeOverrides);

    if (storeAsDefault) {
      const defaults = {
        ...reportComposerDefaults,
        defaultReportFormatId: reportFormatId,
        includeNotes,
        includeOverrides,
      };
      this.props.saveReportComposerDefaults(defaults);
    }

    const report_format = reportFormats.find(
      format => reportFormatId === format.id,
    );

    const extension = isDefined(report_format)
      ? report_format.extension
      : 'unknown'; // unknown should never happen but we should be save here

    this.handleInteraction();

    return gmp.report
      .download(entity, {
        reportFormatId,
        filter: newFilter,
      })
      .then(response => {
        this.setState({showDownloadReportDialog: false});
        const {data} = response;
        const filename = generateFilename({
          creationTime: entity.creationTime,
          extension,
          fileNameFormat: reportExportFileName,
          id: entity.id,
          modificationTime: entity.modificationTime,
          reportFormat: report_format,
          resourceName: entity.task.name,
          resourceType: 'report',
          username,
        });

        onDownload({filename, data});
      }, this.handleError);
  }

  handleTlsCertificateDownload(cert) {
    const {onDownload} = this.props;

    const {data, serial} = cert;

    this.handleInteraction();

    onDownload({
      filename: 'tls-cert-' + serial + '.pem',
      data: create_pem_certificate(data),
    });
  }

  handleFilterCreated(filter) {
    this.handleInteraction();
    this.load(filter);
    this.props.loadFilters();
  }

  handleFilterAddLogLevel() {
    const {reportFilter} = this.props;
    let levels = reportFilter.get('levels', '');

    this.handleInteraction();

    if (!levels.includes('g')) {
      levels += 'g';
      const lfilter = reportFilter.copy();
      lfilter.set('levels', levels);
      this.load(lfilter);
    }
  }

  handleFilterRemoveSeverity() {
    const {reportFilter} = this.props;

    this.handleInteraction();

    if (reportFilter.has('severity')) {
      const lfilter = reportFilter.copy();
      lfilter.delete('severity');
      this.load(lfilter);
    }
  }

  handleFilterDecreaseMinQoD() {
    const {reportFilter} = this.props;

    this.handleInteraction();

    if (reportFilter.has('min_qod')) {
      const lfilter = reportFilter.copy();
      lfilter.set('min_qod', 30);
      this.load(lfilter);
    }
  }

  handleSortChange(name, sortField) {
    this.handleInteraction();

    const prev = this.state.sorting[name];

    const sortReverse =
      sortField === prev.sortField ? !prev.sortReverse : false;

    this.setState({
      sorting: {
        ...this.state.sorting,
        [name]: {
          sortField,
          sortReverse,
        },
      },
    });
  }

  handleInteraction() {
    const {onInteraction} = this.props;
    if (isDefined(onInteraction)) {
      onInteraction();
    }
  }

  loadTarget() {
    const {entity} = this.props;
    const target = getTarget(entity);

    return this.props.loadTarget(target.id);
  }

  render() {
    const {
      entity,
      entityError,
      filters = [],
      gmp,
      isLoading,
      pageFilter,
      reportFilter,
      reportFormats,
      onInteraction,
      reportComposerDefaults,
      showError,
      showErrorMessage,
      showSuccessMessage,
    } = this.props;
    const {
      activeTab,
      isUpdating = false,
      showFilterDialog,
      showDownloadReportDialog,
      sorting,
      storeAsDefault,
    } = this.state;

    const {report} = entity || {};

    const threshold = gmp.settings.reportResultsThreshold;
    const showThresholdMessage =
      hasValue(report) && report.results.counts.filtered > threshold;

    return (
      <React.Fragment>
        <TargetComponent
          onError={this.handleError}
          onInteraction={onInteraction}
        >
          {({edit}) => (
            <Page
              activeTab={activeTab}
              entity={entity}
              entityError={entityError}
              filters={filters}
              isLoading={isLoading}
              isUpdating={isUpdating}
              pageFilter={pageFilter}
              reportFilter={reportFilter}
              sorting={sorting}
              task={isDefined(report) ? report.task : undefined}
              onActivateTab={this.handleActivateTab}
              onAddToAssetsClick={this.handleAddToAssets}
              onError={this.handleError}
              onFilterAddLogLevelClick={this.handleFilterAddLogLevel}
              onFilterDecreaseMinQoDClick={this.handleFilterDecreaseMinQoD}
              onFilterChanged={this.handleFilterChange}
              onFilterCreated={this.handleFilterCreated}
              onFilterEditClick={this.handleFilterEditClick}
              onFilterRemoveSeverityClick={this.handleFilterRemoveSeverity}
              onFilterResetClick={this.handleFilterResetClick}
              onFilterRemoveClick={this.handleFilterRemoveClick}
              onInteraction={onInteraction}
              onRemoveFromAssetsClick={this.handleRemoveFromAssets}
              onReportDownloadClick={this.handleOpenDownloadReportDialog}
              onSortChange={this.handleSortChange}
              onTagSuccess={this.handleChanged}
              onTargetEditClick={() =>
                this.loadTarget().then(response => edit(response.data))
              }
              onTlsCertificateDownloadClick={this.handleTlsCertificateDownload}
              showError={showError}
              showErrorMessage={showErrorMessage}
              showSuccessMessage={showSuccessMessage}
            />
          )}
        </TargetComponent>
        {showFilterDialog && (
          <FilterDialog
            filter={reportFilter}
            delta={false}
            onFilterChanged={this.handleFilterChange}
            onCloseClick={this.handleFilterDialogClose}
            createFilterType="result"
            onFilterCreated={this.handleFilterCreated}
          />
        )}
        {showDownloadReportDialog && (
          <DownloadReportDialog
            defaultReportFormatId={reportComposerDefaults.defaultReportFormatId}
            filter={reportFilter}
            includeNotes={reportComposerDefaults.includeNotes}
            includeOverrides={reportComposerDefaults.includeOverrides}
            reportFormats={reportFormats}
            showThresholdMessage={showThresholdMessage}
            storeAsDefault={storeAsDefault}
            threshold={threshold}
            onClose={this.handleCloseDownloadReportDialog}
            onSave={this.handleReportDownload}
          />
        )}
      </React.Fragment>
    );
  }
}

ReportDetails.propTypes = {
  defaultFilter: PropTypes.filter.isRequired,
  entity: PropTypes.model,
  entityError: PropTypes.object,
  filter: PropTypes.filter,
  filters: PropTypes.array,
  gmp: PropTypes.gmp.isRequired,
  isLoading: PropTypes.bool.isRequired,
  loadFilters: PropTypes.func.isRequired,
  loadReportComposerDefaults: PropTypes.func.isRequired,
  loadReportFormats: PropTypes.func.isRequired,
  loadSettings: PropTypes.func.isRequired,
  loadTarget: PropTypes.func.isRequired,
  location: PropTypes.object.isRequired,
  match: PropTypes.object.isRequired,
  pageFilter: PropTypes.filter,
  reload: PropTypes.func.isRequired,
  reportComposerDefaults: PropTypes.object,
  reportExportFileName: PropTypes.string,
  reportFilter: PropTypes.filter,
  reportFormats: PropTypes.array,
  reportId: PropTypes.id,
  resultDefaultFilter: PropTypes.filter,
  saveReportComposerDefaults: PropTypes.func.isRequired,
  showError: PropTypes.func.isRequired,
  showErrorMessage: PropTypes.func.isRequired,
  showSuccessMessage: PropTypes.func.isRequired,
  target: PropTypes.model,
  username: PropTypes.string,
  onDownload: PropTypes.func.isRequired,
  onInteraction: PropTypes.func.isRequired,
};

const reloadInterval = report =>
  isDefined(report) && isActive(report.report.scan_run_status)
    ? USE_DEFAULT_RELOAD_INTERVAL_ACTIVE
    : NO_RELOAD; // report doesn't change anymore. no need to reload

const load = ({
  defaultFilter,
  reportId,
  loadReportWithThreshold,
  reportFilter,
  updateFilter,
}) => filter => {
  if (!hasValue(filter)) {
    // use loaded filter after initial loading
    filter = reportFilter;
  }

  if (!hasValue(filter)) {
    // use filter from user setting
    filter = defaultFilter;
  }

  if (!hasValue(filter)) {
    // use fallback filter
    filter = DEFAULT_FILTER;
  }

  updateFilter(filter);
  return loadReportWithThreshold(reportId, {filter});
};

const ReportDetailsWrapper = ({defaultFilter, reportFilter, ...props}) => (
  <Reload
    name="report"
    load={load({...props, defaultFilter})}
    reload={load({...props, defaultFilter, reportFilter})}
    reloadInterval={() => reloadInterval(props.entity)}
  >
    {({reload}) => (
      <ReportDetails
        {...props}
        defaultFilter={defaultFilter}
        reportFilter={reportFilter}
        reload={reload}
      />
    )}
  </Reload>
);

ReportDetailsWrapper.propTypes = {
  defaultFilter: PropTypes.filter,
  entity: PropTypes.model,
  gmp: PropTypes.gmp.isRequired,
  reportFilter: PropTypes.filter,
};

const getReportPageName = id => `report-${id}`;

const mapDispatchToProps = (dispatch, {gmp, match}) => ({
  onInteraction: () => dispatch(renewSessionTimeout(gmp)()),
  loadFilters: () => dispatch(loadFilters(gmp)(RESULTS_FILTER_FILTER)),
  loadSettings: () => dispatch(loadUserSettingDefaults(gmp)()),
  loadTarget: targetId => gmp.target.get({id: targetId}),
  loadReportFormats: () =>
    dispatch(loadReportFormats(gmp)(REPORT_FORMATS_FILTER)),
  loadReportWithThreshold: (id, options) =>
    dispatch(loadEntityWithThreshold(gmp)(id, options)),
  loadReportComposerDefaults: () => dispatch(loadReportComposerDefaults(gmp)()),
  loadUserSettingDefaultFilter: () =>
    dispatch(loadUserSettingsDefaultFilter(gmp)('result')),
  saveReportComposerDefaults: reportComposerDefaults =>
    dispatch(saveReportComposerDefaults(gmp)(reportComposerDefaults)),
  updateFilter: f =>
    dispatch(setPageFilter(getReportPageName(match.params.id), f)),
});

const mapStateToProps = (rootState, {match}) => {
  const {id} = match.params;
  const filterSel = filterSelector(rootState);
  const reportSel = reportSelector(rootState);
  const reportFormatsSel = reportFormatsSelector(rootState);
  const userDefaultsSelector = getUserSettingsDefaults(rootState);
  const userDefaultFilterSel = getUserSettingsDefaultFilter(
    rootState,
    'result',
  );
  const username = getUsername(rootState);

  const entity = reportSel.getEntity(id);
  const entityError = reportSel.getEntityError(id);
  const pSelector = getPage(rootState);
  return {
    entity,
    entityError,
    pageFilter: pSelector.getFilter(getReportPageName(id)),
    filters: filterSel.getAllEntities(RESULTS_FILTER_FILTER),
    isLoading: !isDefined(entity),
    reportExportFileName: userDefaultsSelector.getValueByName(
      'reportexportfilename',
    ),
    reportFilter: getFilter(entity),
    reportFormats: reportFormatsSel.getAllEntities(REPORT_FORMATS_FILTER),
    reportId: id,
    reportComposerDefaults: getReportComposerDefaults(rootState),
    resultDefaultFilter: userDefaultFilterSel.getFilter('result'),
    username,
  };
};

export default compose(
  withGmp,
  withDialogNotification,
  withDownload,
  withDefaultFilter('result'),
  connect(
    mapStateToProps,
    mapDispatchToProps,
  ),
)(ReportDetailsWrapper);

// vim: set ts=2 sw=2 tw=80:
