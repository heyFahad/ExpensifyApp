import React from 'react';
import {View} from 'react-native';
import PropTypes from 'prop-types';
import {withOnyx} from 'react-native-onyx';
import lodashGet from 'lodash/get';
import _ from 'underscore';
import compose from '../../libs/compose';
import styles from '../../styles/styles';
import ONYXKEYS from '../../ONYXKEYS';
import withLocalize, {withLocalizePropTypes} from '../withLocalize';
import withCurrentUserPersonalDetails, {withCurrentUserPersonalDetailsPropTypes, withCurrentUserPersonalDetailsDefaultProps} from '../withCurrentUserPersonalDetails';
import Icon from '../Icon';
import CONST from '../../CONST';
import * as Expensicons from '../Icon/Expensicons';
import Checkbox from '../Checkbox';
import * as StyleUtils from '../../styles/StyleUtils';
import getButtonState from '../../libs/getButtonState';
import Navigation from '../../libs/Navigation/Navigation';
import ROUTES from '../../ROUTES';
import reportActionPropTypes from '../../pages/home/report/reportActionPropTypes';
import * as Task from '../../libs/actions/Task';
import * as ReportUtils from '../../libs/ReportUtils';
import RenderHTML from '../RenderHTML';
import PressableWithoutFeedback from '../Pressable/PressableWithoutFeedback';
import personalDetailsPropType from '../../pages/personalDetailsPropType';
import * as Session from '../../libs/actions/Session';
import * as LocalePhoneNumber from '../../libs/LocalePhoneNumber';

const propTypes = {
    /** All personal details asssociated with user */
    personalDetailsList: PropTypes.objectOf(personalDetailsPropType),

    /** The ID of the associated taskReport */
    taskReportID: PropTypes.string.isRequired,

    /** Whether the task preview is hovered so we can modify its style */
    isHovered: PropTypes.bool,

    /** The linked reportAction */
    action: PropTypes.shape(reportActionPropTypes).isRequired,

    /* Onyx Props */

    taskReport: PropTypes.shape({
        /** Title of the task */
        reportName: PropTypes.string,

        /** AccountID of the manager in this iou report */
        managerID: PropTypes.number,

        /** AccountID of the creator of this iou report */
        ownerAccountID: PropTypes.number,
    }),

    ...withLocalizePropTypes,

    ...withCurrentUserPersonalDetailsPropTypes,
};

const defaultProps = {
    ...withCurrentUserPersonalDetailsDefaultProps,
    personalDetailsList: {},
    taskReport: {},
    isHovered: false,
};

function TaskPreview(props) {
    // The reportAction might not contain details regarding the taskReport
    // Only the direct parent reportAction will contain details about the taskReport
    // Other linked reportActions will only contain the taskReportID and we will grab the details from there
    const isTaskCompleted = !_.isEmpty(props.taskReport)
        ? props.taskReport.stateNum === CONST.REPORT.STATE_NUM.SUBMITTED && props.taskReport.statusNum === CONST.REPORT.STATUS.APPROVED
        : props.action.childStateNum === CONST.REPORT.STATE_NUM.SUBMITTED && props.action.childStatusNum === CONST.REPORT.STATUS.APPROVED;
    const taskTitle = props.taskReport.reportName || props.action.childReportName;
    const taskAssigneeAccountID = Task.getTaskAssigneeAccountID(props.taskReport) || props.action.childManagerAccountID;
    const assigneeLogin = lodashGet(props.personalDetailsList, [taskAssigneeAccountID, 'login'], '');
    const assigneeDisplayName = lodashGet(props.personalDetailsList, [taskAssigneeAccountID, 'displayName'], '');
    const taskAssignee = assigneeDisplayName || LocalePhoneNumber.formatPhoneNumber(assigneeLogin);
    const htmlForTaskPreview =
        taskAssignee && taskAssigneeAccountID !== 0 ? `<comment><mention-user accountid="${taskAssigneeAccountID}">@${taskAssignee}</mention-user> ${taskTitle}</comment>` : `<comment>${taskTitle}</comment>`;
    const isDeletedParentAction = ReportUtils.isCanceledTaskReport(props.taskReport, props.action);

    if (isDeletedParentAction) {
        return <RenderHTML html={`<comment>${props.translate('parentReportAction.deletedTask')}</comment>`} />;
    }

    return (
        <View style={[styles.chatItemMessage]}>
            <PressableWithoutFeedback
                onPress={() => Navigation.navigate(ROUTES.REPORT_WITH_ID.getRoute(props.taskReportID))}
                style={[styles.flexRow, styles.justifyContentBetween]}
                accessibilityRole={CONST.ACCESSIBILITY_ROLE.BUTTON}
                accessibilityLabel={props.translate('task.task')}
            >
                <View style={[styles.flex1, styles.flexRow, styles.alignItemsStart]}>
                    <Checkbox
                        style={[styles.mr2]}
                        containerStyle={[styles.taskCheckbox]}
                        isChecked={isTaskCompleted}
                        disabled={!Task.canModifyTask(props.taskReport, props.currentUserPersonalDetails.accountID)}
                        onPress={Session.checkIfActionIsAllowed(() => {
                            if (isTaskCompleted) {
                                Task.reopenTask(props.taskReport);
                            } else {
                                Task.completeTask(props.taskReport);
                            }
                        })}
                        accessibilityLabel={props.translate('task.task')}
                    />
                    <RenderHTML html={htmlForTaskPreview} />
                </View>
                <Icon
                    src={Expensicons.ArrowRight}
                    fill={StyleUtils.getIconFillColor(getButtonState(props.isHovered))}
                />
            </PressableWithoutFeedback>
        </View>
    );
}

TaskPreview.propTypes = propTypes;
TaskPreview.defaultProps = defaultProps;
TaskPreview.displayName = 'TaskPreview';

export default compose(
    withLocalize,
    withCurrentUserPersonalDetails,
    withOnyx({
        taskReport: {
            key: ({taskReportID}) => `${ONYXKEYS.COLLECTION.REPORT}${taskReportID}`,
            initialValue: {},
        },
        personalDetailsList: {
            key: ONYXKEYS.PERSONAL_DETAILS_LIST,
            initialValue: {},
        },
    }),
)(TaskPreview);
