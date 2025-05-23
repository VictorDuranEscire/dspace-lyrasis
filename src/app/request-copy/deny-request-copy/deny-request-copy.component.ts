import { AsyncPipe } from '@angular/common';
import {
  Component,
  OnInit,
} from '@angular/core';
import {
  ActivatedRoute,
  Router,
} from '@angular/router';
import {
  TranslateModule,
  TranslateService,
} from '@ngx-translate/core';
import {
  combineLatest as observableCombineLatest,
  Observable,
} from 'rxjs';
import {
  map,
  switchMap,
} from 'rxjs/operators';

import { AuthService } from '../../core/auth/auth.service';
import { DSONameService } from '../../core/breadcrumbs/dso-name.service';
import { ItemDataService } from '../../core/data/item-data.service';
import { ItemRequestDataService } from '../../core/data/item-request-data.service';
import { RemoteData } from '../../core/data/remote-data';
import { EPerson } from '../../core/eperson/models/eperson.model';
import { redirectOn4xx } from '../../core/shared/authorized.operators';
import { Item } from '../../core/shared/item.model';
import { ItemRequest } from '../../core/shared/item-request.model';
import {
  getFirstCompletedRemoteData,
  getFirstSucceededRemoteDataPayload,
} from '../../core/shared/operators';
import { isNotEmpty } from '../../shared/empty.util';
import { ThemedLoadingComponent } from '../../shared/loading/themed-loading.component';
import { NotificationsService } from '../../shared/notifications/notifications.service';
import { VarDirective } from '../../shared/utils/var.directive';
import { RequestCopyEmail } from '../email-request-copy/request-copy-email.model';
import { ThemedEmailRequestCopyComponent } from '../email-request-copy/themed-email-request-copy.component';

@Component({
  selector: 'ds-base-deny-request-copy',
  styleUrls: ['./deny-request-copy.component.scss'],
  templateUrl: './deny-request-copy.component.html',
  standalone: true,
  imports: [VarDirective, ThemedEmailRequestCopyComponent, ThemedLoadingComponent, AsyncPipe, TranslateModule],
})
/**
 * Component for denying an item request
 */
export class DenyRequestCopyComponent implements OnInit {
  /**
   * The item request to deny
   */
  itemRequestRD$: Observable<RemoteData<ItemRequest>>;

  /**
   * The default subject of the message to send to the user requesting the item
   */
  subject$: Observable<string>;
  /**
   * The default contents of the message to send to the user requesting the item
   */
  message$: Observable<string>;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private translateService: TranslateService,
    private itemDataService: ItemDataService,
    private nameService: DSONameService,
    private itemRequestService: ItemRequestDataService,
    private notificationsService: NotificationsService,
  ) {

  }

  ngOnInit(): void {
    this.itemRequestRD$ = this.route.data.pipe(
      map((data) => data.request as RemoteData<ItemRequest>),
      getFirstCompletedRemoteData(),
      redirectOn4xx(this.router, this.authService),
    );

    const msgParams$ = observableCombineLatest([
      this.itemRequestRD$.pipe(getFirstSucceededRemoteDataPayload()),
      this.authService.getAuthenticatedUserFromStore(),
    ]).pipe(
      switchMap(([itemRequest, user]: [ItemRequest, EPerson]) => {
        return this.itemDataService.findById(itemRequest.itemId).pipe(
          getFirstSucceededRemoteDataPayload(),
          map((item: Item) => {
            const uri = item.firstMetadataValue('dc.identifier.uri');
            return Object.assign({
              recipientName: itemRequest.requestName,
              itemUrl: isNotEmpty(uri) ? uri : item.handle,
              itemName: this.nameService.getName(item),
              authorName: this.nameService.getName(user),
              authorEmail: user.email,
            });
          }),
        );
      }),
    );

    this.subject$ = this.translateService.get('deny-request-copy.email.subject');
    this.message$ = msgParams$.pipe(
      switchMap((params) => this.translateService.get('deny-request-copy.email.message', params)),
    );
  }

  /**
   * Deny the item request
   * @param email Subject and contents of the message to send back to the user requesting the item
   */
  deny(email: RequestCopyEmail) {
    this.itemRequestRD$.pipe(
      getFirstSucceededRemoteDataPayload(),
      switchMap((itemRequest: ItemRequest) => this.itemRequestService.deny(itemRequest.token, email)),
      getFirstCompletedRemoteData(),
    ).subscribe((rd) => {
      if (rd.hasSucceeded) {
        this.notificationsService.success(this.translateService.get('deny-request-copy.success'));
        this.router.navigateByUrl('/');
      } else {
        this.notificationsService.error(this.translateService.get('deny-request-copy.error'), rd.errorMessage);
      }
    });
  }

}
