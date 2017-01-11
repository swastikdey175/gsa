/* Greenbone Security Assistant
 *
 * Authors:
 * Björn Ricks <bjoern.ricks@greenbone.net>
 *
 * Copyright:
 * Copyright (C) 2016 - 2017 Greenbone Networks GmbH
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

import _ from '../../locale.js';
import {has_value} from '../../utils.js';

import Pagination from '../pagination.js';
import Layout from '../layout.js';

import StrippedTable from '../table/stripped.js';

export const EntitiesTable = props => {
  let {filter, header, footer, entries, counts, emptyTitle} = props;

  let filterstring = filter ? filter.toFilterString() : '';

  if (!has_value(entries)) {
    return <div className="entities-table">{_('Loading')}</div>;
  }

  if (entries.length === 0) {
    return <div className="entities-table">{emptyTitle}</div>;
  }

  let pagination = (
    <Pagination
      counts={counts}
      onFirstClick={props.onFirstClick}
      onLastClick={props.onLastClick}
      onNextClick={props.onNextClick}
      onPreviousClick={props.onPreviousClick}/>
  );

  return (
    <div className="entities-table">
      {pagination}
      <StrippedTable header={header} footer={footer}>
        {entries}
      </StrippedTable>
      <Layout flex align="space-between">
        <div className="footnote">
          {_('(Applied filter: {{filter}})', {filter: filterstring})}
        </div>
        {pagination}
      </Layout>
    </div>
  );
};

EntitiesTable.propTypes = {
  emptyTitle: React.PropTypes.string,
  filter: React.PropTypes.object,
  header: React.PropTypes.node,
  footer: React.PropTypes.node,
  entries: React.PropTypes.node,
  counts: React.PropTypes.object,
  onFirstClick: React.PropTypes.func,
  onLastClick: React.PropTypes.func,
  onPreviousClick: React.PropTypes.func,
  onNextClick: React.PropTypes.func,
  onToggleOverridesClick: React.PropTypes.func,
};


export default EntitiesTable;

// vim: set ts=2 sw=2 tw=80: