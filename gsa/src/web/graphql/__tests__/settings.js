/* Copyright (C) 2020 Greenbone Networks GmbH
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

/* eslint-disable react/prop-types */

import React from 'react';

import {rendererWith, wait, screen} from 'web/utils/testing';

import {useGetSetting} from '../settings';
import {createGetSettingQueryMock} from '../__mocks__/settings';

const TestUseSetting = ({settingId}) => {
  const {setting, loading: isLoading} = useGetSetting(settingId);
  if (isLoading) {
    return <div data-testid="loading" />;
  }
  return (
    <div data-testid="setting">
      <div data-testid="id">{setting.id}</div>
      <div data-testid="comment">{setting.comment}</div>
      <div data-testid="name">{setting.name}</div>
      <div data-testid="value">{setting.value}</div>
    </div>
  );
};

describe('useGetSetting tests', () => {
  test('should load setting', async () => {
    const id = 'id-1';
    const comment = 'A comment';
    const name = 'foo';
    const value = 'bar';

    const [mock, resultFunc] = createGetSettingQueryMock(id, {
      comment,
      name,
      value,
    });

    const {render} = rendererWith({
      queryMocks: [mock],
    });

    render(<TestUseSetting settingId={id} />);

    let loading = screen.getByTestId('loading');
    expect(loading).toBeInTheDocument();

    await wait();

    expect(resultFunc).toHaveBeenCalled();

    loading = screen.queryByTestId('loading');
    expect(loading).not.toBeInTheDocument();

    const settingId = screen.getByTestId('id');
    const settingComment = screen.getByTestId('comment');
    const settingName = screen.getByTestId('name');
    const settingValue = screen.getByTestId('value');

    expect(settingId).toHaveTextContent(id);
    expect(settingComment).toHaveTextContent(comment);
    expect(settingName).toHaveTextContent(name);
    expect(settingValue).toHaveTextContent(value);
  });
});