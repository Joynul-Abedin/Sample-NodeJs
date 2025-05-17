const db = require('../config/database');
const oracledb = require('oracledb');
const logger = require('../utils/logger');

// Create a new expense report
const createExpenseReport = async (req, res) => {
    let connection;
    try {
        const { 
            header,
            lines
        } = req.body;
        
        connection = await db.getConnection();
        
        // Start transaction
        await connection.execute('BEGIN');
        
        // Insert header
        const headerResult = await connection.execute(
            `INSERT INTO XXSSGIL_AP_EXPENSE_REPORT_H (
                REPORT_HEADER_ID, EMPLOYEE_ID, WEEK_END_DATE, CREATION_DATE, CREATED_BY, 
                LAST_UPDATE_DATE, LAST_UPDATED_BY, VOUCHNO, TOTAL, VENDOR_ID, 
                VENDOR_SITE_ID, EXPENSE_CHECK_ADDRESS_FLAG, REFERENCE_1, REFERENCE_2, 
                INVOICE_NUM, EXPENSE_REPORT_ID, SET_OF_BOOKS_ID, SOURCE, PURGEABLE_FLAG, 
                DESCRIPTION, DEFAULT_CURRENCY_CODE
            ) VALUES (
                :report_header_id, :employee_id, :week_end_date, CURRENT_TIMESTAMP, :created_by,
                CURRENT_TIMESTAMP, :last_updated_by, :vouchno, :total, :vendor_id,
                :vendor_site_id, :expense_check_address_flag, :reference_1, :reference_2,
                :invoice_num, :expense_report_id, :set_of_books_id, :source, :purgeable_flag,
                :description, :default_currency_code
            )`,
            {
                report_header_id: header.report_header_id,
                employee_id: header.employee_id,
                week_end_date: new Date(header.week_end_date),
                created_by: header.created_by,
                last_updated_by: header.last_updated_by,
                vouchno: header.vouchno,
                total: header.total,
                vendor_id: header.vendor_id,
                vendor_site_id: header.vendor_site_id,
                expense_check_address_flag: header.expense_check_address_flag,
                reference_1: header.reference_1,
                reference_2: header.reference_2,
                invoice_num: header.invoice_num || `${header.report_header_id}/`,
                expense_report_id: header.expense_report_id,
                set_of_books_id: header.set_of_books_id,
                source: header.source || 'XpenseXpress',
                purgeable_flag: header.purgeable_flag || 'N',
                description: header.description,
                default_currency_code: header.default_currency_code || 'BDT'
            }
        );
        
        // Insert lines
        if (lines && lines.length > 0) {
            for (const line of lines) {
                await connection.execute(
                    `INSERT INTO XXSSGIL_AP_EXPENSE_REPORT_L (
                        REPORT_HEADER_ID, LAST_UPDATE_DATE, LAST_UPDATED_BY, CODE_COMBINATION_ID,
                        ITEM_DESCRIPTION, SET_OF_BOOKS_ID, AMOUNT, CURRENCY_CODE,
                        LINE_TYPE_LOOKUP_CODE, CREATION_DATE, CREATED_BY,
                        DISTRIBUTION_LINE_NUMBER, START_EXPENSE_DATE
                    ) VALUES (
                        :report_header_id, CURRENT_TIMESTAMP, :last_updated_by, :code_combination_id,
                        :item_description, :set_of_books_id, :amount, :currency_code,
                        :line_type_lookup_code, CURRENT_TIMESTAMP, :created_by,
                        :distribution_line_number, :start_expense_date
                    )`,
                    {
                        report_header_id: header.report_header_id,
                        last_updated_by: header.last_updated_by,
                        code_combination_id: line.code_combination_id,
                        item_description: line.item_description,
                        set_of_books_id: header.set_of_books_id,
                        amount: line.amount,
                        currency_code: line.currency_code || header.default_currency_code || 'BDT',
                        line_type_lookup_code: line.line_type_lookup_code || 'ITEM',
                        created_by: header.created_by,
                        distribution_line_number: line.distribution_line_number,
                        start_expense_date: line.start_expense_date ? new Date(line.start_expense_date) : new Date()
                    }
                );
            }
        }
        
        // Commit transaction
        await connection.execute('COMMIT');
        
        logger.info(`Expense report created with ID: ${header.report_header_id}`);
        
        res.status(201).json({
            success: true,
            message: 'Expense report created successfully',
            data: { report_header_id: header.report_header_id }
        });
    } catch (error) {
        if (connection) {
            await connection.execute('ROLLBACK');
        }
        
        logger.error(`Error creating expense report: ${error.message}`, { error, body: req.body });
        res.status(500).json({
            success: false,
            message: 'Error creating expense report',
            error: error.message
        });
    } finally {
        if (connection) {
            try {
                await db.closeConnection(connection);
            } catch (err) {
                logger.error(`Error closing connection: ${err.message}`);
            }
        }
    }
};

// Get all expense reports with pagination
const getAllExpenseReports = async (req, res) => {
    let connection;
    try {
        // Parse pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        
        connection = await db.getConnection();
        
        // Get total count
        const countResult = await connection.execute(
            'SELECT COUNT(*) AS total FROM XXSSGIL_AP_EXPENSE_REPORT_H',
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        
        const totalCount = countResult.rows[0].TOTAL;
        
        // Get paginated results
        const result = await connection.execute(
            `SELECT 
                REPORT_HEADER_ID, EMPLOYEE_ID, WEEK_END_DATE, CREATION_DATE, 
                LAST_UPDATE_DATE, VOUCHNO, TOTAL, INVOICE_NUM, DESCRIPTION,
                EXPENSE_STATUS_CODE, DEFAULT_CURRENCY_CODE, ORG_ID
             FROM XXSSGIL_AP_EXPENSE_REPORT_H
             ORDER BY REPORT_HEADER_ID DESC
             OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY`,
            { offset, limit },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        
        res.status(200).json({
            success: true,
            count: totalCount,
            data: result.rows,
            pagination: {
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit)
            }
        });
    } catch (error) {
        logger.error(`Error fetching expense reports: ${error.message}`, { error });
        res.status(500).json({
            success: false,
            message: 'Error fetching expense reports',
            error: error.message
        });
    } finally {
        if (connection) {
            try {
                await db.closeConnection(connection);
            } catch (err) {
                logger.error(`Error closing connection: ${err.message}`);
            }
        }
    }
};

// Get expense report by ID with its lines
const getExpenseReportById = async (req, res) => {
    let connection;
    try {
        const { id } = req.params;
        
        connection = await db.getConnection();
        
        // Get the header
        const headerResult = await connection.execute(
            'SELECT * FROM XXSSGIL_AP_EXPENSE_REPORT_H WHERE REPORT_HEADER_ID = :id',
            [id],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        
        if (headerResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Expense report not found'
            });
        }
        
        // Get the lines
        const linesResult = await connection.execute(
            'SELECT * FROM XXSSGIL_AP_EXPENSE_REPORT_L WHERE REPORT_HEADER_ID = :id',
            [id],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        
        res.status(200).json({
            success: true,
            data: {
                header: headerResult.rows[0],
                lines: linesResult.rows
            }
        });
    } catch (error) {
        logger.error(`Error fetching expense report: ${error.message}`, { error, params: req.params });
        res.status(500).json({
            success: false,
            message: 'Error fetching expense report',
            error: error.message
        });
    } finally {
        if (connection) {
            try {
                await db.closeConnection(connection);
            } catch (err) {
                logger.error(`Error closing connection: ${err.message}`);
            }
        }
    }
};

// Update expense report
const updateExpenseReport = async (req, res) => {
    let connection;
    try {
        const { id } = req.params;
        const { header, lines } = req.body;
        
        connection = await db.getConnection();
        
        // Start transaction
        await connection.execute('BEGIN');
        
        // Check if expense report exists
        const checkResult = await connection.execute(
            'SELECT 1 FROM XXSSGIL_AP_EXPENSE_REPORT_H WHERE REPORT_HEADER_ID = :id',
            [id],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        
        if (checkResult.rows.length === 0) {
            await connection.execute('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Expense report not found'
            });
        }
        
        // Update header
        const updateFields = [];
        const bindParams = { id: parseInt(id) };
        
        // Dynamically build update query based on provided fields
        if (header) {
            Object.keys(header).forEach(key => {
                if (key !== 'report_header_id' && header[key] !== undefined) {
                    updateFields.push(`${key.toUpperCase()} = :${key}`);
                    bindParams[key] = header[key];
                }
            });
        }
        
        // Always update last_update_date and last_updated_by
        updateFields.push('LAST_UPDATE_DATE = CURRENT_TIMESTAMP');
        if (header && header.last_updated_by) {
            updateFields.push('LAST_UPDATED_BY = :last_updated_by');
            bindParams.last_updated_by = header.last_updated_by;
        }
        
        if (updateFields.length > 0) {
            const updateHeaderSQL = `
                UPDATE XXSSGIL_AP_EXPENSE_REPORT_H
                SET ${updateFields.join(', ')}
                WHERE REPORT_HEADER_ID = :id
            `;
            
            await connection.execute(updateHeaderSQL, bindParams);
        }
        
        // Handle line updates if provided
        if (lines && lines.length > 0) {
            // First delete existing lines
            await connection.execute(
                'DELETE FROM XXSSGIL_AP_EXPENSE_REPORT_L WHERE REPORT_HEADER_ID = :id',
                [id]
            );
            
            // Then insert new lines
            for (const line of lines) {
                await connection.execute(
                    `INSERT INTO XXSSGIL_AP_EXPENSE_REPORT_L (
                        REPORT_HEADER_ID, LAST_UPDATE_DATE, LAST_UPDATED_BY, CODE_COMBINATION_ID,
                        ITEM_DESCRIPTION, SET_OF_BOOKS_ID, AMOUNT, CURRENCY_CODE,
                        LINE_TYPE_LOOKUP_CODE, CREATION_DATE, CREATED_BY,
                        DISTRIBUTION_LINE_NUMBER, START_EXPENSE_DATE
                    ) VALUES (
                        :report_header_id, CURRENT_TIMESTAMP, :last_updated_by, :code_combination_id,
                        :item_description, :set_of_books_id, :amount, :currency_code,
                        :line_type_lookup_code, CURRENT_TIMESTAMP, :created_by,
                        :distribution_line_number, :start_expense_date
                    )`,
                    {
                        report_header_id: parseInt(id),
                        last_updated_by: line.last_updated_by || (header ? header.last_updated_by : null),
                        code_combination_id: line.code_combination_id,
                        item_description: line.item_description,
                        set_of_books_id: line.set_of_books_id,
                        amount: line.amount,
                        currency_code: line.currency_code || (header ? header.default_currency_code : 'BDT'),
                        line_type_lookup_code: line.line_type_lookup_code || 'ITEM',
                        created_by: line.created_by || (header ? header.created_by : null),
                        distribution_line_number: line.distribution_line_number,
                        start_expense_date: line.start_expense_date ? new Date(line.start_expense_date) : new Date()
                    }
                );
            }
        }
        
        // Commit transaction
        await connection.execute('COMMIT');
        
        logger.info(`Expense report updated with ID: ${id}`);
        
        res.status(200).json({
            success: true,
            message: 'Expense report updated successfully',
            data: { report_header_id: id }
        });
    } catch (error) {
        if (connection) {
            await connection.execute('ROLLBACK');
        }
        
        logger.error(`Error updating expense report: ${error.message}`, { error, body: req.body, params: req.params });
        res.status(500).json({
            success: false,
            message: 'Error updating expense report',
            error: error.message
        });
    } finally {
        if (connection) {
            try {
                await db.closeConnection(connection);
            } catch (err) {
                logger.error(`Error closing connection: ${err.message}`);
            }
        }
    }
};

// Delete expense report
const deleteExpenseReport = async (req, res) => {
    let connection;
    try {
        const { id } = req.params;
        
        connection = await db.getConnection();
        
        // Start transaction
        await connection.execute('BEGIN');
        
        // Delete lines first due to foreign key constraint
        await connection.execute(
            'DELETE FROM XXSSGIL_AP_EXPENSE_REPORT_L WHERE REPORT_HEADER_ID = :id',
            [id]
        );
        
        // Delete header
        const result = await connection.execute(
            'DELETE FROM XXSSGIL_AP_EXPENSE_REPORT_H WHERE REPORT_HEADER_ID = :id',
            [id]
        );
        
        if (result.rowsAffected === 0) {
            await connection.execute('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Expense report not found'
            });
        }
        
        // Commit transaction
        await connection.execute('COMMIT');
        
        logger.info(`Expense report deleted with ID: ${id}`);
        
        res.status(200).json({
            success: true,
            message: 'Expense report deleted successfully'
        });
    } catch (error) {
        if (connection) {
            await connection.execute('ROLLBACK');
        }
        
        logger.error(`Error deleting expense report: ${error.message}`, { error, params: req.params });
        res.status(500).json({
            success: false,
            message: 'Error deleting expense report',
            error: error.message
        });
    } finally {
        if (connection) {
            try {
                await db.closeConnection(connection);
            } catch (err) {
                logger.error(`Error closing connection: ${err.message}`);
            }
        }
    }
};

module.exports = {
    createExpenseReport,
    getAllExpenseReports,
    getExpenseReportById,
    updateExpenseReport,
    deleteExpenseReport
}; 