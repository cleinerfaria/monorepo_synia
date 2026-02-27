# VidaSystem — Estrutura do Banco de Dados

> Documento gerado a partir de todas as migrations em `packages/db-vidasystem/supabase/migrations/`.
> Representa o estado **final** de cada tabela após todas as alterações aplicadas.

---

## Tipos ENUM

### enum_theme_preference
`'light'`, `'dark'`, `'system'`

### enum_company_unit_type
`'matriz'`, `'filial'`

### enum_client_type
`'insurer'`, `'company'`, `'individual'`

### enum_gender
`'male'`, `'female'`, `'other'`

### enum_item_type
`'medication'`, `'material'`, `'diet'`

### enum_status
`'available'`, `'in_use'`, `'maintenance'`, `'inactive'`

### enum_reference_type
`'nfe_import'`, `'prescription'`, `'manual'`, `'consumption'`

### enum_movement_type
`'in'`, `'out'`, `'adjust'`

### enum_prescription_status
`'draft'`, `'active'`, `'suspended'`, `'finished'`

### enum_prescription_item_type
`'medication'`, `'diet'`, `'equipment'`, `'procedure'`

### enum_unit_scope
`'medication_base'`, `'medication_prescription'`, `'material_base'`, `'material_prescription'`, `'diet_base'`, `'diet_prescription'`, `'prescription_frequency'`, `'procedure'`, `'equipment'`, `'scale'`

### patient_address_type
`'home'`, `'billing'`, `'service'`, `'other'`

### patient_contact_type
`'phone'`, `'whatsapp'`, `'email'`, `'other'`

### patient_identifier_type
`'cns'`, `'prontuario'`, `'operadora'`, `'externo'`, `'other'`

### client_contact_type
`'phone'`, `'whatsapp'`, `'email'`, `'other'`

### procedure_category
`'visit'`, `'care'`, `'therapy'`, `'administration'`, `'evaluation'`

### enum_prescription_times_unit
`'day'`, `'week'`, `'month'`

### enum_prescription_frequency_mode
`'every'`, `'times_per'`, `'shift'`

### race_type
`'white'`, `'black'`, `'brown'`, `'yellow'`, `'indigenous'`, `'not_informed'`

### enum_prescription_type
`'medical'`, `'nursing'`, `'nutrition'`

### enum_prescription_item_supplier
`'company'`, `'family'`, `'government'`, `'other'`

### enum_prescription_occurrence_status
`'pending'`, `'done'`, `'not_done'`, `'canceled'`

### enum_pad_shift_status
`'planned'`, `'open'`, `'assigned'`, `'in_progress'`, `'finished'`, `'missed'`, `'canceled'`

### enum_pad_event_type
`'claim'`, `'assign'`, `'unassign'`, `'checkin'`, `'checkout'`, `'override_checkin'`, `'override_checkout'`, `'swap'`, `'absence'`, `'cover'`, `'extra'`, `'cancel'`, `'note'`

### enum_pad_item_type
`'shift'`, `'visit'`, `'session'`

### enum_pad_item_frequency
`'weekly'`, `'biweekly'`, `'monthly'`, `'bimonthly'`, `'quarterly'`

---

## Tabelas

### company

| Coluna                   | Tipo                  |
| ------------------------ | --------------------- |
| id                       | uuid                  |
| name                     | text                  |
| trade_name               | text                  |
| document                 | text                  |
| tax_regime               | text                  |
| special_tax_regime       | text                  |
| taxation_nature          | text                  |
| cnae                     | text                  |
| cnes                     | text                  |
| state_registration       | text                  |
| email                    | text                  |
| website                  | text                  |
| logo_url_expanded_dark   | text                  |
| logo_url_collapsed_dark  | text                  |
| logo_url_expanded_light  | text                  |
| logo_url_collapsed_light | text                  |
| primary_color            | text                  |
| theme_preference         | enum_theme_preference |
| is_active                | boolean               |
| created_at               | timestamptz           |
| updated_at               | timestamptz           |

### company_unit

| Coluna     | Tipo                   |
| ---------- | ---------------------- |
| id         | uuid                   |
| company_id | uuid                   |
| name       | text                   |
| trade_name | text                   |
| unit_type  | enum_company_unit_type |
| document   | text                   |
| zip        | text                   |
| street     | text                   |
| number     | text                   |
| complement | text                   |
| district   | text                   |
| city       | text                   |
| state      | text                   |
| is_active  | boolean                |
| created_at | timestamptz            |
| updated_at | timestamptz            |

### app_user

| Coluna            | Tipo                  |
| ----------------- | --------------------- |
| id                | uuid                  |
| company_id        | uuid                  |
| auth_user_id      | uuid                  |
| name              | text                  |
| email             | text                  |
| theme_preference  | enum_theme_preference |
| is_active         | boolean               |
| created_at        | timestamptz           |
| updated_at        | timestamptz           |
| access_profile_id | uuid                  |

### system_user

| Coluna        | Tipo        |
| ------------- | ----------- |
| auth_user_id  | uuid        |
| is_superadmin | boolean     |
| name          | text        |
| email         | text        |
| created_at    | timestamptz |

### client

| Coluna     | Tipo             |
| ---------- | ---------------- |
| id         | uuid             |
| company_id | uuid             |
| type       | enum_client_type |
| code       | text             |
| name       | text             |
| document   | text             |
| email      | text             |
| phone      | text             |
| zip        | text             |
| street     | text             |
| number     | text             |
| complement | text             |
| district   | text             |
| city       | text             |
| state      | text             |
| is_active  | boolean          |
| created_at | timestamptz      |
| updated_at | timestamptz      |
| ans_code   | text             |
| tiss       | text             |
| color      | text             |
| logo_url   | text             |

### client_contact

| Coluna              | Tipo                |
| ------------------- | ------------------- |
| id                  | uuid                |
| company_id          | uuid                |
| client_id           | uuid                |
| name                | text                |
| department          | text                |
| position            | text                |
| type                | client_contact_type |
| value               | text                |
| notes               | text                |
| is_primary          | boolean             |
| can_receive_updates | boolean             |
| is_active           | boolean             |
| created_at          | timestamptz         |
| updated_at          | timestamptz         |

### professional

| Coluna         | Tipo        |
| -------------- | ----------- |
| id             | uuid        |
| company_id     | uuid        |
| code           | text        |
| name           | text        |
| council_type   | text        |
| council_number | text        |
| council_uf     | text        |
| gender         | enum_gender |
| phone          | text        |
| email          | text        |
| is_active      | boolean     |
| created_at     | timestamptz |
| updated_at     | timestamptz |
| profession_id  | uuid        |
| social_name    | text        |

### professional_user

| Coluna          | Tipo        |
| --------------- | ----------- |
| id              | uuid        |
| company_id      | uuid        |
| professional_id | uuid        |
| user_id         | uuid        |
| is_active       | boolean     |
| created_at      | timestamptz |
| updated_at      | timestamptz |

### profession

| Coluna      | Tipo        |
| ----------- | ----------- |
| id          | uuid        |
| company_id  | uuid        |
| code        | text        |
| name        | text        |
| description | text        |
| is_active   | boolean     |
| created_at  | timestamptz |
| updated_at  | timestamptz |

### patient

| Coluna            | Tipo        |
| ----------------- | ----------- |
| id                | uuid        |
| company_id        | uuid        |
| code              | text        |
| name              | text        |
| name_normalized   | text        |
| cpf               | text        |
| birth_date        | date        |
| gender            | enum_gender |
| mother_name       | text        |
| father_name       | text        |
| phone             | text        |
| email             | text        |
| billing_client_id | uuid        |
| is_active         | boolean     |
| created_at        | timestamptz |
| updated_at        | timestamptz |
| race              | race_type   |
| social_name       | text        |

### patient_address

| Coluna          | Tipo                 |
| --------------- | -------------------- |
| id              | uuid                 |
| company_id      | uuid                 |
| patient_id      | uuid                 |
| type            | patient_address_type |
| label           | text                 |
| zip             | text                 |
| street          | text                 |
| number          | text                 |
| complement      | text                 |
| district        | text                 |
| city            | text                 |
| state           | text                 |
| country         | text                 |
| longitude       | numeric(10,8)        |
| latitude        | numeric(10,8)        |
| use_for_service | boolean              |
| reference       | text                 |
| is_primary      | boolean              |
| is_active       | boolean              |
| created_at      | timestamptz          |
| updated_at      | timestamptz          |

### patient_contact

| Coluna              | Tipo                 |
| ------------------- | -------------------- |
| id                  | uuid                 |
| company_id          | uuid                 |
| patient_id          | uuid                 |
| name                | text                 |
| relationship        | text                 |
| type                | patient_contact_type |
| value               | text                 |
| notes               | text                 |
| is_primary          | boolean              |
| can_receive_updates | boolean              |
| is_active           | boolean              |
| created_at          | timestamptz          |
| updated_at          | timestamptz          |

### patient_identifier

| Coluna     | Tipo                    |
| ---------- | ----------------------- |
| id         | uuid                    |
| company_id | uuid                    |
| patient_id | uuid                    |
| type       | patient_identifier_type |
| source     | text                    |
| identifier | text                    |
| notes      | text                    |
| is_active  | boolean                 |
| created_at | timestamptz             |
| updated_at | timestamptz             |

### patient_payer

| Coluna           | Tipo         |
| ---------------- | ------------ |
| id               | uuid         |
| company_id       | uuid         |
| patient_id       | uuid         |
| client_id        | uuid         |
| is_primary       | boolean      |
| coverage_percent | numeric(5,2) |
| start_date       | date         |
| end_date         | date         |
| notes            | text         |
| is_active        | boolean      |
| created_at       | timestamptz  |
| updated_at       | timestamptz  |

### product

| Coluna                   | Tipo           |
| ------------------------ | -------------- |
| id                       | uuid           |
| company_id               | uuid           |
| item_type                | enum_item_type |
| code                     | text           |
| name                     | text           |
| description              | text           |
| unit_stock_id            | uuid           |
| unit_prescription_id     | uuid           |
| min_stock                | decimal(15,3)  |
| concentration            | text           |
| active_ingredient_id     | uuid           |
| tiss_ref                 | text           |
| tuss_ref                 | text           |
| psychotropic             | boolean        |
| antibiotic               | boolean        |
| is_active                | boolean        |
| created_at               | timestamptz    |
| updated_at               | timestamptz    |
| group_id                 | uuid           |
| unit_prescription_factor | decimal(15,6)  |

### product_presentation

| Coluna            | Tipo          |
| ----------------- | ------------- |
| id                | uuid          |
| company_id        | uuid          |
| product_id        | uuid          |
| name              | text          |
| barcode           | text          |
| conversion_factor | decimal(15,6) |
| supplier_name     | text          |
| is_active         | boolean       |
| created_at        | timestamptz   |
| updated_at        | timestamptz   |
| manufacturer_id   | uuid          |
| unit              | text          |

### product_group

| Coluna      | Tipo        |
| ----------- | ----------- |
| id          | uuid        |
| company_id  | uuid        |
| code        | text        |
| name        | text        |
| description | text        |
| parent_id   | uuid        |
| color       | text        |
| icon        | text        |
| sort_order  | integer     |
| is_active   | boolean     |
| is_system   | boolean     |
| created_at  | timestamptz |
| updated_at  | timestamptz |

### product_ref_link

| Coluna            | Tipo          |
| ----------------- | ------------- |
| id                | uuid          |
| company_id        | uuid          |
| product_id        | uuid          |
| ref_item_id       | uuid          |
| source_id         | uuid          |
| is_primary        | boolean       |
| conversion_factor | numeric(10,4) |
| notes             | text          |
| created_at        | timestamptz   |
| updated_at        | timestamptz   |

### active_ingredient

| Coluna            | Tipo        |
| ----------------- | ----------- |
| id                | uuid        |
| company_id        | uuid        |
| code              | text        |
| name              | text        |
| cas_number        | text        |
| description       | text        |
| therapeutic_class | text        |
| is_active         | boolean     |
| created_at        | timestamptz |
| updated_at        | timestamptz |

### manufacturer

| Coluna               | Tipo        |
| -------------------- | ----------- |
| id                   | uuid        |
| company_id           | uuid        |
| code                 | text        |
| name                 | text        |
| trade_name           | text        |
| document             | text        |
| website              | text        |
| phone                | text        |
| email                | text        |
| zip                  | text        |
| street               | text        |
| number               | text        |
| complement           | text        |
| district             | text        |
| city                 | text        |
| state                | text        |
| anvisa_authorization | text        |
| notes                | text        |
| is_active            | boolean     |
| created_at           | timestamptz |
| updated_at           | timestamptz |
| brasindice_code      | text        |

### supplier

| Coluna                 | Tipo        |
| ---------------------- | ----------- |
| id                     | uuid        |
| company_id             | uuid        |
| code                   | text        |
| name                   | text        |
| trade_name             | text        |
| document               | text        |
| state_registration     | text        |
| municipal_registration | text        |
| phone                  | text        |
| email                  | text        |
| website                | text        |
| zip                    | text        |
| street                 | text        |
| number                 | text        |
| complement             | text        |
| district               | text        |
| city                   | text        |
| state                  | text        |
| contact_name           | text        |
| contact_phone          | text        |
| payment_terms          | text        |
| notes                  | text        |
| is_active              | boolean     |
| created_at             | timestamptz |
| updated_at             | timestamptz |

### unit_of_measure

| Coluna         | Tipo              |
| -------------- | ----------------- |
| id             | uuid              |
| company_id     | uuid              |
| code           | text              |
| name           | text              |
| symbol         | text              |
| description    | text              |
| allowed_scopes | enum_unit_scope[] |
| is_active      | boolean           |
| created_at     | timestamptz       |
| updated_at     | timestamptz       |

### equipment

| Coluna              | Tipo        |
| ------------------- | ----------- |
| id                  | uuid        |
| company_id          | uuid        |
| code                | text        |
| name                | text        |
| description         | text        |
| serial_number       | text        |
| patrimony_code      | text        |
| status              | enum_status |
| assigned_patient_id | uuid        |
| assigned_at         | timestamptz |
| created_at          | timestamptz |
| updated_at          | timestamptz |

### stock_location

| Coluna     | Tipo        |
| ---------- | ----------- |
| id         | uuid        |
| company_id | uuid        |
| code       | text        |
| name       | text        |
| is_active  | boolean     |
| created_at | timestamptz |
| updated_at | timestamptz |

### stock_balance

| Coluna      | Tipo          |
| ----------- | ------------- |
| id          | uuid          |
| company_id  | uuid          |
| location_id | uuid          |
| product_id  | uuid          |
| qty_on_hand | decimal(15,3) |
| avg_cost    | decimal(15,4) |
| updated_at  | timestamptz   |

### stock_movement

| Coluna           | Tipo                |
| ---------------- | ------------------- |
| id               | uuid                |
| company_id       | uuid                |
| location_id      | uuid                |
| product_id       | uuid                |
| movement_type    | enum_movement_type  |
| quantity         | decimal(15,3)       |
| unit_cost        | decimal(15,4)       |
| total_cost       | decimal(15,4)       |
| reference_type   | enum_reference_type |
| reference_id     | uuid                |
| occurred_at      | timestamptz         |
| notes            | text                |
| created_at       | timestamptz         |
| batch_id         | uuid                |
| presentation_id  | uuid                |
| presentation_qty | decimal(15,3)       |

### stock_batch

| Coluna           | Tipo          |
| ---------------- | ------------- |
| id               | uuid          |
| company_id       | uuid          |
| product_id       | uuid          |
| location_id      | uuid          |
| batch_number     | text          |
| expiration_date  | date          |
| manufacture_date | date          |
| qty_on_hand      | decimal(15,3) |
| unit_cost        | decimal(15,4) |
| nfe_import_id    | uuid          |
| supplier_name    | text          |
| notes            | text          |
| created_at       | timestamptz   |
| updated_at       | timestamptz   |
| supplier_id      | uuid          |
| presentation_id  | uuid          |

### nfe_import

| Coluna          | Tipo          |
| --------------- | ------------- |
| id              | uuid          |
| company_id      | uuid          |
| status          | text          |
| access_key      | text          |
| number          | text          |
| issuer_name     | text          |
| issuer_document | text          |
| issued_at       | timestamptz   |
| xml_url         | text          |
| error_message   | text          |
| created_at      | timestamptz   |
| updated_at      | timestamptz   |
| total_value     | decimal(15,4) |
| supplier_id     | uuid          |

### nfe_import_item

| Coluna           | Tipo          |
| ---------------- | ------------- |
| id               | uuid          |
| company_id       | uuid          |
| nfe_import_id    | uuid          |
| raw_description  | text          |
| unit             | text          |
| quantity         | decimal(15,3) |
| unit_price       | decimal(15,4) |
| total_price      | decimal(15,4) |
| product_id       | uuid          |
| created_at       | timestamptz   |
| product_code     | text          |
| ncm              | text          |
| presentation_id  | uuid          |
| batch_number     | text          |
| expiration_date  | date          |
| manufacture_date | date          |
| ean              | text          |
| anvisa_code      | text          |
| pmc_price        | decimal(15,4) |
| item_number      | integer       |

### prescription

| Coluna          | Tipo                     |
| --------------- | ------------------------ |
| id              | uuid                     |
| company_id      | uuid                     |
| code            | text                     |
| patient_id      | uuid                     |
| professional_id | uuid                     |
| status          | enum_prescription_status |
| start_date      | date                     |
| end_date        | date                     |
| notes           | text                     |
| attachment_url  | text                     |
| created_at      | timestamptz              |
| updated_at      | timestamptz              |
| type            | enum_prescription_type   |

### prescription_item

| Coluna                | Tipo                             |
| --------------------- | -------------------------------- |
| id                    | uuid                             |
| company_id            | uuid                             |
| code                  | text                             |
| prescription_id       | uuid                             |
| item_type             | enum_prescription_item_type      |
| product_id            | uuid                             |
| equipment_id          | uuid                             |
| quantity              | decimal(10,3)                    |
| start_date            | date                             |
| end_date              | date                             |
| created_at            | timestamptz                      |
| updated_at            | timestamptz                      |
| procedure_id          | uuid                             |
| is_prn                | boolean                          |
| is_continuous_use     | boolean                          |
| justification         | text                             |
| instructions_use      | text                             |
| instructions_pharmacy | text                             |
| diluent_text          | text                             |
| frequency_mode        | enum_prescription_frequency_mode |
| interval_minutes      | integer                          |
| time_start            | time                             |
| times_value           | integer                          |
| times_unit            | enum_prescription_times_unit     |
| time_checks           | time[]                           |
| week_days             | smallint[]                       |
| route_id              | uuid                             |
| supplier              | enum_prescription_item_supplier  |
| is_active             | boolean                          |
| item_order            | integer                          |
| display_name          | text                             |

### prescription_item_component

| Coluna               | Tipo          |
| -------------------- | ------------- |
| id                   | uuid          |
| company_id           | uuid          |
| prescription_item_id | uuid          |
| product_id           | uuid          |
| quantity             | numeric(10,3) |
| created_at           | timestamptz   |
| updated_at           | timestamptz   |

### prescription_item_occurrence

| Coluna               | Tipo                                |
| -------------------- | ----------------------------------- |
| id                   | uuid                                |
| company_id           | uuid                                |
| patient_id           | uuid                                |
| prescription_id      | uuid                                |
| prescription_item_id | uuid                                |
| scheduled_at         | timestamptz                         |
| status               | enum_prescription_occurrence_status |
| checked_by_shift_id  | uuid                                |
| checked_at           | timestamptz                         |
| check_id             | uuid                                |
| created_at           | timestamptz                         |
| updated_at           | timestamptz                         |

### prescription_print_counter

| Coluna       | Tipo        |
| ------------ | ----------- |
| company_id   | uuid        |
| counter_year | integer     |
| last_value   | integer     |
| updated_at   | timestamptz |

### prescription_print

| Coluna             | Tipo        |
| ------------------ | ----------- |
| id                 | uuid        |
| company_id         | uuid        |
| prescription_id    | uuid        |
| print_year         | integer     |
| print_seq          | integer     |
| print_number       | text        |
| period_start       | date        |
| period_end         | date        |
| week_start_day     | smallint    |
| patient_snapshot   | jsonb       |
| notes_snapshot     | text        |
| metadata_snapshot  | jsonb       |
| created_at         | timestamptz |
| created_by         | uuid        |
| payload_content_id | uuid        |

### prescription_print_item

| Coluna                      | Tipo        |
| --------------------------- | ----------- |
| id                          | uuid        |
| company_id                  | uuid        |
| prescription_print_id       | uuid        |
| source_prescription_item_id | uuid        |
| order_index                 | integer     |
| description_snapshot        | text        |
| route_snapshot              | text        |
| frequency_snapshot          | text        |
| grid_snapshot               | jsonb       |
| created_at                  | timestamptz |
| item_content_id             | uuid        |

### prescription_print_payload_content

| Coluna            | Tipo        |
| ----------------- | ----------- |
| id                | uuid        |
| company_id        | uuid        |
| content_version   | smallint    |
| content_hash      | text        |
| patient_snapshot  | jsonb       |
| notes_snapshot    | text        |
| metadata_snapshot | jsonb       |
| created_at        | timestamptz |

### prescription_print_item_content

| Coluna               | Tipo        |
| -------------------- | ----------- |
| id                   | uuid        |
| company_id           | uuid        |
| content_version      | smallint    |
| content_hash         | text        |
| description_snapshot | text        |
| route_snapshot       | text        |
| frequency_snapshot   | text        |
| grid_snapshot        | jsonb       |
| created_at           | timestamptz |

### administration_routes

| Coluna             | Tipo        |
| ------------------ | ----------- |
| id                 | uuid        |
| company_id         | uuid        |
| name               | text        |
| abbreviation       | text        |
| description        | text        |
| is_active          | boolean     |
| created_at         | timestamptz |
| updated_at         | timestamptz |
| prescription_order | integer     |
| code               | text        |

### procedure

| Coluna      | Tipo               |
| ----------- | ------------------ |
| id          | uuid               |
| company_id  | uuid               |
| code        | text               |
| name        | text               |
| category    | procedure_category |
| unit_id     | uuid               |
| description | text               |
| is_active   | boolean            |
| created_at  | timestamptz        |
| updated_at  | timestamptz        |

### patient_consumption

| Coluna      | Tipo          |
| ----------- | ------------- |
| id          | uuid          |
| company_id  | uuid          |
| patient_id  | uuid          |
| product_id  | uuid          |
| location_id | uuid          |
| quantity    | decimal(15,3) |
| consumed_at | timestamptz   |
| notes       | text          |
| created_at  | timestamptz   |

### ref_source

| Coluna      | Tipo        |
| ----------- | ----------- |
| id          | uuid        |
| code        | text        |
| name        | text        |
| description | text        |
| is_active   | boolean     |
| config      | jsonb       |
| created_at  | timestamptz |
| updated_at  | timestamptz |

### ref_import_batch

| Coluna         | Tipo        |
| -------------- | ----------- |
| id             | uuid        |
| source_id      | uuid        |
| company_id     | uuid        |
| status         | text        |
| started_at     | timestamptz |
| finished_at    | timestamptz |
| file_name      | text        |
| file_path      | text        |
| file_hash      | text        |
| file_size      | bigint      |
| rows_read      | integer     |
| rows_inserted  | integer     |
| rows_updated   | integer     |
| rows_skipped   | integer     |
| rows_error     | integer     |
| error_summary  | text        |
| import_options | jsonb       |
| created_by     | uuid        |
| created_at     | timestamptz |
| updated_at     | timestamptz |

### ref_import_error

| Coluna        | Tipo        |
| ------------- | ----------- |
| id            | uuid        |
| batch_id      | uuid        |
| row_number    | integer     |
| raw_data      | jsonb       |
| error_type    | text        |
| error_message | text        |
| created_at    | timestamptz |

### ref_item

| Coluna                | Tipo          |
| --------------------- | ------------- |
| id                    | uuid          |
| source_id             | uuid          |
| company_id            | uuid          |
| external_code         | text          |
| product_name          | text          |
| presentation          | text          |
| concentration         | text          |
| entry_unit            | text          |
| base_unit             | text          |
| quantity              | decimal(10,4) |
| tiss                  | text          |
| tuss                  | text          |
| ean                   | text          |
| manufacturer_code     | text          |
| manufacturer_name     | text          |
| category              | text          |
| subcategory           | text          |
| is_active             | boolean       |
| extra_data            | jsonb         |
| first_import_batch_id | uuid          |
| last_import_batch_id  | uuid          |
| created_at            | timestamptz   |
| updated_at            | timestamptz   |

### ref_price_history

| Coluna          | Tipo          |
| --------------- | ------------- |
| id              | uuid          |
| item_id         | uuid          |
| import_batch_id | uuid          |
| price_type      | text          |
| price_value     | decimal(12,4) |
| currency        | text          |
| valid_from      | date          |
| price_meta      | jsonb         |
| created_at      | timestamptz   |

### access_profile

| Coluna      | Tipo        |
| ----------- | ----------- |
| id          | uuid        |
| company_id  | uuid        |
| code        | text        |
| name        | text        |
| description | text        |
| is_admin    | boolean     |
| is_active   | boolean     |
| created_at  | timestamptz |
| updated_at  | timestamptz |

### system_module

| Coluna        | Tipo    |
| ------------- | ------- |
| id            | uuid    |
| code          | text    |
| name          | text    |
| description   | text    |
| icon          | text    |
| display_order | integer |
| is_active     | boolean |

### module_permission

| Coluna      | Tipo |
| ----------- | ---- |
| id          | uuid |
| module_id   | uuid |
| code        | text |
| name        | text |
| description | text |

### access_profile_permission

| Coluna        | Tipo        |
| ------------- | ----------- |
| id            | uuid        |
| profile_id    | uuid        |
| permission_id | uuid        |
| created_at    | timestamptz |

### user_action_logs

| Coluna      | Tipo        |
| ----------- | ----------- |
| id          | uuid        |
| company_id  | uuid        |
| user_id     | uuid        |
| action      | text        |
| entity      | text        |
| entity_id   | text        |
| entity_name | text        |
| old_data    | jsonb       |
| new_data    | jsonb       |
| ip_address  | inet        |
| user_agent  | text        |
| created_at  | timestamptz |

### pad

| Coluna           | Tipo                   |
| ---------------- | ---------------------- |
| id               | uuid                   |
| company_id       | uuid                   |
| patient_id       | uuid                   |
| start_date       | date                   |
| end_date         | date                   |
| start_time       | time without time zone |
| is_active        | boolean                |
| notes            | text                   |
| created_at       | timestamptz            |
| updated_at       | timestamptz            |
| patient_payer_id | uuid                   |
| company_unit_id  | uuid                   |
| professional_id  | uuid                   |
| pad_service_id   | uuid                   |
| start_at         | timestamptz            |
| end_at           | timestamptz            |

### pad_items

| Coluna               | Tipo                    |
| -------------------- | ----------------------- |
| id                   | uuid                    |
| pad_id               | uuid                    |
| company_id           | uuid                    |
| type                 | enum_pad_item_type      |
| profession_id        | uuid                    |
| hours_per_day        | integer                 |
| shift_duration_hours | integer                 |
| frequency            | enum_pad_item_frequency |
| quantity             | integer                 |
| is_active            | boolean                 |
| notes                | text                    |
| created_at           | timestamptz             |
| updated_at           | timestamptz             |

### pad_shift

| Coluna                   | Tipo                  |
| ------------------------ | --------------------- |
| id                       | uuid                  |
| company_id               | uuid                  |
| patient_id               | uuid                  |
| pad_item_id              | uuid                  |
| start_at                 | timestamptz           |
| end_at                   | timestamptz           |
| status                   | enum_pad_shift_status |
| assigned_professional_id | uuid                  |
| check_in_at              | timestamptz           |
| check_out_at             | timestamptz           |
| check_in_lat             | numeric(10,6)         |
| check_in_lng             | numeric(10,6)         |
| check_out_lat            | numeric(10,6)         |
| check_out_lng            | numeric(10,6)         |
| closed_by                | uuid                  |
| closure_note             | text                  |
| created_at               | timestamptz           |
| updated_at               | timestamptz           |

### pad_event

| Coluna                | Tipo                |
| --------------------- | ------------------- |
| id                    | uuid                |
| company_id            | uuid                |
| shift_id              | uuid                |
| type                  | enum_pad_event_type |
| actor_professional_id | uuid                |
| note                  | text                |
| payload               | jsonb               |
| created_at            | timestamptz         |

### pad_service

| Coluna      | Tipo        |
| ----------- | ----------- |
| id          | uuid        |
| company_id  | uuid        |
| code        | text        |
| name        | text        |
| description | text        |
| sort_order  | integer     |
| is_active   | boolean     |
| created_at  | timestamptz |
| updated_at  | timestamptz |

### business_partner

| Coluna     | Tipo        |
| ---------- | ----------- |
| id         | uuid        |
| company_id | uuid        |
| code       | text        |
| name       | text        |
| legal_name | text        |
| document   | text        |
| email      | text        |
| phone      | text        |
| zip        | text        |
| street     | text        |
| number     | text        |
| complement | text        |
| district   | text        |
| city       | text        |
| state      | text        |
| is_active  | boolean     |
| notes      | text        |
| created_at | timestamptz |
| updated_at | timestamptz |

### business_partner_profession

| Coluna              | Tipo        |
| ------------------- | ----------- |
| id                  | uuid        |
| company_id          | uuid        |
| business_partner_id | uuid        |
| profession_id       | uuid        |
| created_at          | timestamptz |
| updated_at          | timestamptz |
