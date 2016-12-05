/* Greenbone Security Assistant
 * $Id$
 * Description: Headers for Response Data struct
 *
 * Authors:
 * Matthew Mundell <matthew.mundell@greenbone.net>
 * Jan-Oliver Wagner <jan-oliver.wagner@greenbone.net>
 * Björn Ricks <bjoern.ricks@greenbone.net>
 *
 * Copyright:
 * Copyright (C) 2016 Greenbone Networks GmbH
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

/**
 * @file gsad_cmd.h
 * @brief Headers for Response Data struct
 */

#ifndef _GSAD_CMD_H
#define _GSAD_CMD_H

#include <glib.h>

/**
 * @brief Response information for commands.
 */
typedef struct {
  int http_status_code;  ///> HTTP status code.
  gchar *redirect;       ///> Redirect URL or NULL.
} cmd_response_data_t;

void cmd_response_data_init (cmd_response_data_t* data);

void cmd_response_data_reset (cmd_response_data_t* data);

#endif /* not _GSAD_CMD_H */